'use client';

import React, { createContext, useContext, useReducer, ReactNode, useEffect, useState } from 'react';
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

// LocalStorage utilities (fallback)
const STORAGE_KEY = 'ai-career-report-data';

const saveToStorage = async (state: AICareerReportState) => {
  try {
    // Only save if we have meaningful data
    const hasData = state.cvData && (
      state.cvData.basics?.name ||
      state.cvData.basics?.email ||
      state.cvData.work?.length > 0 ||
      state.cvData.education?.length > 0 ||
      state.cvData.projects?.length > 0 ||
      state.currentStep > 1 ||
      state.aiAnalysis !== null
    );

    if (!hasData && state.currentStep <= 1 && !state.aiAnalysis) {
      return; // Don't save empty state
    }

    // Try database first
    try {
      const response = await fetch('/api/cv-draft/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cvData: state.cvData,
          aiAnalysis: state.aiAnalysis,
          currentStep: state.currentStep,
          jobId: state.jobId,
          jobData: state.jobData,
          completedSteps: state.completedSteps,
          activeSection: state.activeSection,
          availableSections: state.availableSections
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('💾 Saved CV draft to database:', {
          draftId: result.draftId,
          step: state.currentStep
        });
        return; // Success, no need for fallback
      } else {
        console.warn('⚠️ Failed to save CV draft to database, using localStorage fallback');
      }
    } catch (apiError) {
      console.warn('⚠️ Database save failed, using localStorage fallback:', apiError);
    }

    // Fallback to localStorage if API fails
    fallbackToLocalStorage(state);
  } catch (error) {
    console.warn('⚠️ Failed to save CV draft:', error);
    // Last resort: try localStorage
    fallbackToLocalStorage(state);
  }
};

const fallbackToLocalStorage = (state: AICareerReportState) => {
  if (typeof window !== 'undefined') {
    try {
      const dataToSave = {
        currentStep: state.currentStep,
        cvData: state.cvData,
        aiAnalysis: state.aiAnalysis,
        completedSteps: state.completedSteps,
        activeSection: state.activeSection,
        availableSections: state.availableSections,
        jobId: state.jobId,
        jobData: state.jobData,
        lastSaved: Date.now()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
      console.log('💾 Fallback: Saved to localStorage');
    } catch (localError) {
      console.error('❌ Failed to save to localStorage fallback:', localError);
    }
  }
};

const loadFromStorage = async (): Promise<Partial<AICareerReportState> | null> => {
  try {
    // Try database first
    try {
      const response = await fetch('/api/cv-draft/load', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          console.log('📦 Loaded CV draft from database:', {
            currentStep: result.data.currentStep,
            hasCvData: !!result.data.cvData,
            hasAiAnalysis: !!result.data.aiAnalysis
          });
          return result.data;
        }
      } else {
        console.warn('⚠️ Failed to load CV draft from database, trying localStorage fallback');
      }
    } catch (apiError) {
      console.warn('⚠️ Database load failed, trying localStorage fallback:', apiError);
    }

    // Fallback to localStorage
    return loadFromLocalStorage();
  } catch (error) {
    console.warn('⚠️ Failed to load CV draft:', error);
    return loadFromLocalStorage();
  }
};

const loadFromLocalStorage = (): Partial<AICareerReportState> | null => {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.lastSaved && (Date.now() - parsed.lastSaved) < 24 * 60 * 60 * 1000) {
          console.log('📦 Fallback: Loaded from localStorage');
          return parsed;
        } else {
          // Clear old data
          localStorage.removeItem(STORAGE_KEY);
          sessionStorage.removeItem('ai-career-report-backup');
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to load from localStorage:', error);
    }
  }
  return null;
};

const clearStorage = async () => {
  try {
    // Try database first
    try {
      await fetch('/api/cv-draft/delete', {
        method: 'DELETE'
      });
      console.log('🗑️ Deleted CV draft from database');
    } catch (error) {
      console.warn('⚠️ Failed to delete CV draft from database:', error);
    }
  } catch (error) {
    console.warn('⚠️ Failed to delete CV draft:', error);
  }
  
  // Also clear localStorage fallback
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem('ai-career-report-backup');
    } catch (error) {
      console.warn('⚠️ Failed to clear localStorage:', error);
    }
  }
};

// Default CV data structure
const getDefaultCVData = (): UnifiedCVDataStructure => ({
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
});

// Initial State
const getInitialState = (): AICareerReportState => {
  // Note: loadFromStorage is now async, but we can't use async in getInitialState
  // The provider will handle loading from database on mount
  const savedData = null;
  
  // Log what we're restoring for debugging
  if (savedData) {
    console.log('📦 Restoring AI Career Report data from localStorage:', {
      currentStep: savedData.currentStep,
      hasCvData: !!savedData.cvData,
      cvDataKeys: savedData.cvData ? Object.keys(savedData.cvData) : [],
      workCount: savedData.cvData?.work?.length || 0,
      educationCount: savedData.cvData?.education?.length || 0,
      projectsCount: savedData.cvData?.projects?.length || 0
    });
  } else {
    console.log('📦 No saved data found in localStorage, using defaults');
  }
  
  // Ensure cvData is properly structured - merge saved data with defaults
  let cvData: UnifiedCVDataStructure;
  if (savedData?.cvData) {
    // Merge saved cvData with defaults to ensure all fields exist
    const defaultData = getDefaultCVData();
    cvData = {
      ...defaultData,
      ...savedData.cvData,
      // Ensure nested objects are properly merged
      basics: {
        ...defaultData.basics,
        ...(savedData.cvData.basics || {}),
        location: {
          ...defaultData.basics.location,
          ...(savedData.cvData.basics?.location || {})
        },
        profiles: savedData.cvData.basics?.profiles || defaultData.basics.profiles
      },
      // Ensure arrays exist (they might be undefined)
      work: savedData.cvData.work || [],
      volunteer: savedData.cvData.volunteer || [],
      education: savedData.cvData.education || [],
      awards: savedData.cvData.awards || [],
      certificates: savedData.cvData.certificates || [],
      publications: savedData.cvData.publications || [],
      skills: savedData.cvData.skills || [],
      languages: savedData.cvData.languages || [],
      interests: savedData.cvData.interests || [],
      references: savedData.cvData.references || [],
      projects: savedData.cvData.projects || []
    };
  } else {
    cvData = getDefaultCVData();
  }
  
  return {
    currentStep: savedData?.currentStep || 1,
    cvData,
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
      // Always set CV data when explicitly requested via SET_CV_DATA
      // This is used when parsing CVs or loading data, so we should trust it
      return {
        ...state,
        cvData: {
          ...getDefaultCVData(),
          ...action.payload,
          // Ensure arrays exist
          work: action.payload.work || [],
          education: action.payload.education || [],
          projects: action.payload.projects || [],
          skills: action.payload.skills || [],
          volunteer: action.payload.volunteer || [],
          awards: action.payload.awards || [],
          certificates: action.payload.certificates || [],
          publications: action.payload.publications || [],
          languages: action.payload.languages || [],
          interests: action.payload.interests || [],
          references: action.payload.references || [],
          // Merge basics properly
          basics: {
            ...getDefaultCVData().basics,
            ...(action.payload.basics || {}),
            location: {
              ...getDefaultCVData().basics.location,
              ...(action.payload.basics?.location || {})
            },
            profiles: action.payload.basics?.profiles || []
          }
        }
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
  const [isLoading, setIsLoading] = useState(true);

  // Load data from database on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const savedData = await loadFromStorage();
      
      if (savedData) {
        // Restore CV data
        if (savedData.cvData) {
          dispatch({ type: 'SET_CV_DATA', payload: savedData.cvData });
        }
        
        // Restore AI analysis
        if (savedData.aiAnalysis) {
          dispatch({ type: 'SET_AI_ANALYSIS', payload: savedData.aiAnalysis });
        }
        
        // Restore other state
        if (savedData.currentStep) {
          dispatch({ type: 'SET_CURRENT_STEP', payload: savedData.currentStep });
        }
        
        if (savedData.jobId) {
          dispatch({ type: 'SET_JOB_ID', payload: savedData.jobId });
        }
        
        if (savedData.jobData) {
          dispatch({ type: 'SET_JOB_DATA', payload: savedData.jobData });
        }

        if (savedData.completedSteps) {
          savedData.completedSteps.forEach((step: number) => {
            dispatch({ type: 'SET_COMPLETED_STEP', payload: step });
          });
        }

        if (savedData.activeSection) {
          dispatch({ type: 'SET_ACTIVE_SECTION', payload: savedData.activeSection });
        }

        if (savedData.availableSections) {
          dispatch({ type: 'SET_AVAILABLE_SECTIONS', payload: savedData.availableSections });
        }
      }
      
      setIsLoading(false);
    };

    loadData();
  }, []);

  // Save to database whenever state changes (keep saving for step 3 until CV is actually saved)
  useEffect(() => {
    if (!isLoading) {
      // Always save CV data to database, even in step 3, until Master CV is saved
      // This ensures data persists if user needs to sign in
      if (typeof window !== 'undefined') {
        const masterCVCreated = sessionStorage.getItem('masterCVCreated');
        if (masterCVCreated !== 'true') {
          // Only save if we have meaningful data (not just empty defaults)
          const hasData = state.cvData && (
            state.cvData.basics?.name ||
            state.cvData.basics?.email ||
            state.cvData.work?.length > 0 ||
            state.cvData.education?.length > 0 ||
            state.cvData.projects?.length > 0 ||
            state.currentStep > 1 ||
            state.aiAnalysis !== null // Always save if AI analysis exists
          );
          
          if (hasData || state.currentStep > 1 || state.aiAnalysis !== null) {
            saveToStorage(state);
          }
        }
      }
    }
  }, [state, isLoading]);

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
