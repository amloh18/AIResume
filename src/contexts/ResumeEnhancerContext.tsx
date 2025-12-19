'use client';

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { UnifiedCVDataStructure, DEFAULT_UNIFIED_CV_DATA } from '@/types/unified-cv-schema';
import { ITemplate } from '@/types/template';
import type { FixAnnotation } from '@/components/resume-enhancer/annotations/fix-annotation';
import { CVSurgeonService, type SurgicalFix } from '@/lib/services/cv-surgeon-service';

// State Interface
export interface ResumeEnhancerState {
  // Mode and navigation
  mode: 'create' | 'edit';
  currentStep: 1 | 2 | 3 | 4;
  
  // CV identification
  cvId?: string;
  cvType: 'master' | 'journey' | 'standalone';
  cvTitle: string;
  
  // CV data
  cvData: UnifiedCVDataStructure;
  
  // Template
  selectedTemplate: ITemplate | null;
  
  // Role context
  targetRole: string;
  seniorityLevel: string;
  
  // Job/Journey context
  jobData?: any;
  journeyId?: string;
  
  // AI Analysis
  surgeonAnalysis: { score: number; fixes: SurgicalFix[] } | null;
  isAnalyzing: boolean;

  // Legacy/overlay state (used by ResumeEnhancerClient + overlays)
  showProfilerModal: boolean;
  showSurgeonOverlay: boolean;
  showPreviewOverlay: boolean;
  cvScore: number;
  surgicalFixes: SurgicalFix[];

  // Report / Review & Fix mode (Step 3)
  fixAnnotations: FixAnnotation[];
  reportOpen: boolean;
  reviewMode: boolean;
  activeFixId?: string;
  
  // Save state
  isSaving: boolean;
  saveError: string | null;
  
  // Session tracking
  sessionStartTime: number;
  stepStartTimes: Record<number, number>;
}

// Action Types
type ResumeEnhancerAction =
  | { type: 'SET_MODE'; payload: 'create' | 'edit' }
  | { type: 'SET_STEP'; payload: 1 | 2 | 3 | 4 }
  // Back-compat aliases used by older ResumeEnhancerClient implementation
  | { type: 'SET_CURRENT_STEP'; payload: 1 | 2 | 3 | 4 }
  | { type: 'SET_CV_ID'; payload: string }
  | { type: 'SET_CV_TYPE'; payload: 'master' | 'journey' | 'standalone' }
  | { type: 'SET_CV_TITLE'; payload: string }
  | { type: 'UPDATE_CV_DATA'; payload: Partial<UnifiedCVDataStructure> }
  | { type: 'SET_CV_DATA'; payload: UnifiedCVDataStructure }
  | { type: 'SET_TEMPLATE'; payload: ITemplate | null }
  | { type: 'SET_SELECTED_TEMPLATE'; payload: ITemplate | null }
  | { type: 'SET_ROLE_CONTEXT'; payload: { targetRole: string; seniorityLevel: string } }
  | { type: 'SET_TARGET_ROLE'; payload: string }
  | { type: 'SET_SENIORITY_LEVEL'; payload: string }
  | { type: 'SET_JOB_DATA'; payload: any }
  | { type: 'SET_JOURNEY_ID'; payload: string }
  | { type: 'CONVERT_TO_JOURNEY'; payload: { journeyId: string; jobData: any } }
  | { type: 'SET_SURGEON_ANALYSIS'; payload: { score: number; fixes: SurgicalFix[] } }
  | { type: 'SET_FIX_ANNOTATIONS'; payload: FixAnnotation[] }
  | { type: 'SET_REPORT_OPEN'; payload: boolean }
  | { type: 'SET_REVIEW_MODE'; payload: boolean }
  | { type: 'SET_ACTIVE_FIX'; payload: string | undefined }
  | { type: 'MARK_FIX_APPLIED'; payload: string }
  | { type: 'MARK_FIX_DISMISSED'; payload: string }
  | { type: 'SET_ANALYZING'; payload: boolean }
  | { type: 'SET_SHOW_PROFILER_MODAL'; payload: boolean }
  | { type: 'SET_SHOW_SURGEON_OVERLAY'; payload: boolean }
  | { type: 'SET_SHOW_PREVIEW_OVERLAY'; payload: boolean }
  | { type: 'APPLY_SURGICAL_FIX'; payload: string }
  | { type: 'UPDATE_SURGICAL_FIX_STATUS'; payload: { id: string; status: 'pending' | 'accepted' | 'rejected' } }
  | { type: 'SET_SAVING'; payload: boolean }
  | { type: 'SET_SAVE_ERROR'; payload: string | null }
  | { type: 'RESET_STATE' }
  | { type: 'LOAD_CV'; payload: { cvId: string; cvType: 'master' | 'journey' | 'standalone'; cvTitle: string; cvData: UnifiedCVDataStructure; template?: ITemplate; journeyId?: string; jobData?: any } };

// Initial State
const initialState: ResumeEnhancerState = {
  mode: 'create',
  currentStep: 1,
  cvType: 'standalone',
  cvTitle: 'Untitled Resume',
  cvData: DEFAULT_UNIFIED_CV_DATA,
  selectedTemplate: null,
  targetRole: '',
  seniorityLevel: '',
  surgeonAnalysis: null,
  isAnalyzing: false,
  showProfilerModal: false,
  showSurgeonOverlay: false,
  showPreviewOverlay: false,
  cvScore: 0,
  surgicalFixes: [],
  fixAnnotations: [],
  reportOpen: false,
  reviewMode: false,
  activeFixId: undefined,
  isSaving: false,
  saveError: null,
  sessionStartTime: Date.now(),
  stepStartTimes: { 1: Date.now() }
};

// Reducer
function resumeEnhancerReducer(
  state: ResumeEnhancerState,
  action: ResumeEnhancerAction
): ResumeEnhancerState {
  switch (action.type) {
    case 'SET_MODE':
      return { ...state, mode: action.payload };

    case 'SET_STEP':
      return {
        ...state,
        currentStep: action.payload,
        stepStartTimes: {
          ...state.stepStartTimes,
          [action.payload]: Date.now()
        }
      };

    case 'SET_CURRENT_STEP':
      return {
        ...state,
        currentStep: action.payload,
        stepStartTimes: {
          ...state.stepStartTimes,
          [action.payload]: Date.now()
        }
      };

    case 'SET_CV_ID':
      return { ...state, cvId: action.payload };

    case 'SET_CV_TYPE':
      return { ...state, cvType: action.payload };

    case 'SET_CV_TITLE':
      return { ...state, cvTitle: action.payload };

    case 'UPDATE_CV_DATA':
      return {
        ...state,
        cvData: {
          ...state.cvData,
          ...action.payload
        }
      };

    case 'SET_CV_DATA':
      return { ...state, cvData: action.payload };

    case 'SET_TEMPLATE':
      return { ...state, selectedTemplate: action.payload };

    case 'SET_SELECTED_TEMPLATE':
      return { ...state, selectedTemplate: action.payload };

    case 'SET_ROLE_CONTEXT':
      return {
        ...state,
        targetRole: action.payload.targetRole,
        seniorityLevel: action.payload.seniorityLevel
      };

    case 'SET_TARGET_ROLE':
      return { ...state, targetRole: action.payload };

    case 'SET_SENIORITY_LEVEL':
      return { ...state, seniorityLevel: action.payload };

    case 'SET_JOB_DATA':
      return { ...state, jobData: action.payload };

    case 'SET_JOURNEY_ID':
      return { ...state, journeyId: action.payload };

    case 'CONVERT_TO_JOURNEY':
      return {
        ...state,
        cvType: 'journey',
        journeyId: action.payload.journeyId,
        jobData: action.payload.jobData
      };

    case 'SET_SURGEON_ANALYSIS':
      return {
        ...state,
        surgeonAnalysis: action.payload,
        cvScore: action.payload.score || 0,
        surgicalFixes: (action.payload.fixes || []).map((f) => ({ ...f, status: f.status ?? 'pending' })),
        isAnalyzing: false
      };

    case 'SET_FIX_ANNOTATIONS':
      return { ...state, fixAnnotations: action.payload };

    case 'SET_REPORT_OPEN':
      return { ...state, reportOpen: action.payload };

    case 'SET_REVIEW_MODE':
      return { ...state, reviewMode: action.payload };

    case 'SET_ACTIVE_FIX':
      return { ...state, activeFixId: action.payload };

    case 'MARK_FIX_APPLIED':
      return {
        ...state,
        fixAnnotations: state.fixAnnotations.map((f) =>
          f.id === action.payload ? { ...f, status: 'applied' } : f
        ),
        surgicalFixes: (state.surgicalFixes || []).map((f) =>
          f.id === action.payload ? { ...f, status: 'accepted' } : f
        )
      };

    case 'MARK_FIX_DISMISSED':
      return {
        ...state,
        fixAnnotations: state.fixAnnotations.map((f) =>
          f.id === action.payload ? { ...f, status: 'dismissed' } : f
        ),
        surgicalFixes: (state.surgicalFixes || []).map((f) =>
          f.id === action.payload ? { ...f, status: 'rejected' } : f
        )
      };

    case 'SET_ANALYZING':
      return { ...state, isAnalyzing: action.payload };

    case 'SET_SHOW_PROFILER_MODAL':
      return { ...state, showProfilerModal: action.payload };

    case 'SET_SHOW_SURGEON_OVERLAY':
      return { ...state, showSurgeonOverlay: action.payload };

    case 'SET_SHOW_PREVIEW_OVERLAY':
      return { ...state, showPreviewOverlay: action.payload };

    case 'APPLY_SURGICAL_FIX':
      return {
        ...state,
        surgicalFixes: (state.surgicalFixes || []).map((f) =>
          f.id === action.payload ? { ...f, status: 'accepted' } : f
        ),
        fixAnnotations: state.fixAnnotations.map((f) =>
          f.id === action.payload ? { ...f, status: 'applied' } : f
        )
      };

    case 'UPDATE_SURGICAL_FIX_STATUS':
      return {
        ...state,
        surgicalFixes: (state.surgicalFixes || []).map((f) =>
          f.id === action.payload.id ? { ...f, status: action.payload.status } : f
        )
      };

    case 'SET_SAVING':
      return { ...state, isSaving: action.payload };

    case 'SET_SAVE_ERROR':
      return { ...state, saveError: action.payload };

    case 'LOAD_CV':
      return {
        ...state,
        mode: 'edit',
        currentStep: 3, // Skip to builder/surgeon for editing
        cvId: action.payload.cvId,
        cvType: action.payload.cvType,
        cvTitle: action.payload.cvTitle,
        cvData: action.payload.cvData,
        selectedTemplate: action.payload.template || state.selectedTemplate,
        journeyId: action.payload.journeyId,
        jobData: action.payload.jobData,
        cvScore: 0,
        surgicalFixes: [],
        showPreviewOverlay: false,
        showSurgeonOverlay: false,
        showProfilerModal: false,
        // Reset report state when switching CVs
        fixAnnotations: [],
        reportOpen: false,
        reviewMode: false,
        activeFixId: undefined
      };

    case 'RESET_STATE':
      return {
        ...initialState,
        sessionStartTime: Date.now(),
        stepStartTimes: { 1: Date.now() }
      };

    default:
      return state;
  }
}

// Context
interface ResumeEnhancerContextType {
  state: ResumeEnhancerState;
  dispatch: React.Dispatch<ResumeEnhancerAction>;
  
  // Helper functions
  goToStep: (step: 1 | 2 | 3 | 4) => void;
  nextStep: () => void;
  prevStep: () => void;
  runCVSurgeon: () => Promise<{ score: number; fixes: SurgicalFix[]; annotations: FixAnnotation[] } | null>;
  updateCVData: (data: Partial<UnifiedCVDataStructure>) => void;
  setTemplate: (template: ITemplate) => void;
  setRoleContext: (role: string, seniority: string) => void;
  convertToJourney: (journeyId: string, jobData: any) => void;
  loadCV: (cvData: { cvId: string; cvType: 'master' | 'journey' | 'standalone'; cvTitle: string; cvData: UnifiedCVDataStructure; template?: ITemplate; journeyId?: string; jobData?: any }) => void;
  resetState: () => void;
}

const ResumeEnhancerContext = createContext<ResumeEnhancerContextType | null>(null);

// Provider
export function ResumeEnhancerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(resumeEnhancerReducer, initialState);

  // Helper functions
  const goToStep = (step: 1 | 2 | 3 | 4) => {
    dispatch({ type: 'SET_STEP', payload: step });
  };

  const nextStep = () => {
    const next = Math.min(4, (state.currentStep + 1)) as 1 | 2 | 3 | 4;
    dispatch({ type: 'SET_STEP', payload: next });
  };

  const prevStep = () => {
    const prev = Math.max(1, (state.currentStep - 1)) as 1 | 2 | 3 | 4;
    dispatch({ type: 'SET_STEP', payload: prev });
  };

  const runCVSurgeon = async () => {
    if (!state.targetRole || !state.seniorityLevel) return null;
    dispatch({ type: 'SET_ANALYZING', payload: true });
    try {
      const result = await CVSurgeonService.analyzeCV(
        state.cvData,
        state.targetRole,
        state.seniorityLevel,
        state.jobData
      );
      dispatch({ type: 'SET_SURGEON_ANALYSIS', payload: { score: result.score, fixes: result.fixes } });
      dispatch({ type: 'SET_FIX_ANNOTATIONS', payload: result.annotations });
      return result;
    } catch (e) {
      dispatch({ type: 'SET_ANALYZING', payload: false });
      throw e;
    }
  };

  const updateCVData = (data: Partial<UnifiedCVDataStructure>) => {
    dispatch({ type: 'UPDATE_CV_DATA', payload: data });
  };

  const setTemplate = (template: ITemplate) => {
    dispatch({ type: 'SET_TEMPLATE', payload: template });
  };

  const setRoleContext = (role: string, seniority: string) => {
    dispatch({ type: 'SET_ROLE_CONTEXT', payload: { targetRole: role, seniorityLevel: seniority } });
  };

  const convertToJourney = (journeyId: string, jobData: any) => {
    dispatch({ type: 'CONVERT_TO_JOURNEY', payload: { journeyId, jobData } });
  };

  const loadCV = (cvData: { cvId: string; cvType: 'master' | 'journey' | 'standalone'; cvTitle: string; cvData: UnifiedCVDataStructure; template?: ITemplate; journeyId?: string; jobData?: any }) => {
    dispatch({ type: 'LOAD_CV', payload: cvData });
  };

  const resetState = () => {
    dispatch({ type: 'RESET_STATE' });
  };

  const contextValue: ResumeEnhancerContextType = {
    state,
    dispatch,
    goToStep,
    nextStep,
    prevStep,
    runCVSurgeon,
    updateCVData,
    setTemplate,
    setRoleContext,
    convertToJourney,
    loadCV,
    resetState
  };

  return (
    <ResumeEnhancerContext.Provider value={contextValue}>
      {children}
    </ResumeEnhancerContext.Provider>
  );
}

// Hook to use context
export function useResumeEnhancer() {
  const context = useContext(ResumeEnhancerContext);
  if (!context) {
    throw new Error('useResumeEnhancer must be used within ResumeEnhancerProvider');
  }
  return context;
}
