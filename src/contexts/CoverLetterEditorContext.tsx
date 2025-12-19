'use client';

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { CoverLetterTemplate } from '@/lib/templates/cover-letter-templates';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { formatCoverLetterHeader, mergeCoverLetterContent, extractHeaderFromContent, extractBodyFromContent } from '@/lib/utils/coverLetterUtils';

// Cover Letter Data Structure
export interface CoverLetterData {
  id?: string;
  title: string;
  content: string;
  header?: string;
  body?: string;
  status?: 'draft' | 'published' | 'archived';
  cvId?: string;
  jobId?: string;
  journeyId?: string;
  templateId?: string;
}

// State Interface
export interface CoverLetterEditorState {
  // Mode and navigation
  mode: 'create' | 'edit' | 'journey';
  currentStep: 1 | 2 | 3;
  
  // Cover letter identification
  coverLetterId?: string;
  coverLetterTitle: string;
  
  // Cover letter data
  coverLetterData: CoverLetterData;
  
  // Template
  selectedTemplate: CoverLetterTemplate | null;
  
  // Context data
  cvData: UnifiedCVDataStructure | null;
  jobData: any;
  journeyId?: string;
  
  // Save state
  isSaving: boolean;
  saveError: string | null;
  saveStatus: 'idle' | 'saving' | 'success' | 'error';
  
  // Session tracking
  sessionStartTime: number;
  stepStartTimes: Record<number, number>;
}

// Action Types
type CoverLetterEditorAction =
  | { type: 'SET_MODE'; payload: 'create' | 'edit' | 'journey' }
  | { type: 'SET_STEP'; payload: 1 | 2 | 3 }
  | { type: 'SET_COVER_LETTER_ID'; payload: string | undefined }
  | { type: 'SET_COVER_LETTER_TITLE'; payload: string }
  | { type: 'UPDATE_COVER_LETTER_DATA'; payload: Partial<CoverLetterData> }
  | { type: 'SET_COVER_LETTER_DATA'; payload: CoverLetterData }
  | { type: 'UPDATE_HEADER'; payload: string }
  | { type: 'UPDATE_BODY'; payload: string }
  | { type: 'SET_TEMPLATE'; payload: CoverLetterTemplate | null }
  | { type: 'SET_CV_DATA'; payload: UnifiedCVDataStructure | null }
  | { type: 'SET_JOB_DATA'; payload: any }
  | { type: 'SET_JOURNEY_ID'; payload: string | undefined }
  | { type: 'SET_SAVING'; payload: boolean }
  | { type: 'SET_SAVE_ERROR'; payload: string | null }
  | { type: 'SET_SAVE_STATUS'; payload: 'idle' | 'saving' | 'success' | 'error' }
  | { type: 'LOAD_COVER_LETTER'; payload: { coverLetterId: string; coverLetterData: CoverLetterData; template?: CoverLetterTemplate; cvData?: UnifiedCVDataStructure; jobData?: any; journeyId?: string } }
  | { type: 'RESET_STATE' }
  | { type: 'AUTO_POPULATE_HEADER' };

// Initial State
const initialState: CoverLetterEditorState = {
  mode: 'create',
  currentStep: 1,
  coverLetterTitle: 'Untitled Cover Letter',
  coverLetterData: {
    title: 'Untitled Cover Letter',
    content: '',
    header: '',
    body: '',
    status: 'draft'
  },
  selectedTemplate: null,
  cvData: null,
  jobData: null,
  isSaving: false,
  saveError: null,
  saveStatus: 'idle',
  sessionStartTime: Date.now(),
  stepStartTimes: { 1: Date.now() }
};

// Reducer
function coverLetterEditorReducer(
  state: CoverLetterEditorState,
  action: CoverLetterEditorAction
): CoverLetterEditorState {
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

    case 'SET_COVER_LETTER_ID':
      return { ...state, coverLetterId: action.payload };

    case 'SET_COVER_LETTER_TITLE':
      return {
        ...state,
        coverLetterTitle: action.payload,
        coverLetterData: {
          ...state.coverLetterData,
          title: action.payload
        }
      };

    case 'UPDATE_COVER_LETTER_DATA':
      const updatedData = { ...state.coverLetterData, ...action.payload };
      return {
        ...state,
        coverLetterData: updatedData
      };

    case 'SET_COVER_LETTER_DATA':
      return { ...state, coverLetterData: action.payload };

    case 'UPDATE_HEADER':
      const newHeader = action.payload;
      const mergedContent = mergeCoverLetterContent(newHeader, state.coverLetterData.body || '');
      return {
        ...state,
        coverLetterData: {
          ...state.coverLetterData,
          header: newHeader,
          content: mergedContent
        }
      };

    case 'UPDATE_BODY':
      const newBody = action.payload;
      const mergedContentWithBody = mergeCoverLetterContent(state.coverLetterData.header || '', newBody);
      return {
        ...state,
        coverLetterData: {
          ...state.coverLetterData,
          body: newBody,
          content: mergedContentWithBody
        }
      };

    case 'SET_TEMPLATE':
      return { ...state, selectedTemplate: action.payload };

    case 'SET_CV_DATA':
      return { ...state, cvData: action.payload };

    case 'SET_JOB_DATA':
      return { ...state, jobData: action.payload };

    case 'SET_JOURNEY_ID':
      return { ...state, journeyId: action.payload };

    case 'SET_SAVING':
      return { ...state, isSaving: action.payload };

    case 'SET_SAVE_ERROR':
      return { ...state, saveError: action.payload };

    case 'SET_SAVE_STATUS':
      return { ...state, saveStatus: action.payload };

    case 'AUTO_POPULATE_HEADER':
      if (!state.cvData) return state;
      const autoHeader = formatCoverLetterHeader(state.cvData);
      const autoMergedContent = mergeCoverLetterContent(autoHeader, state.coverLetterData.body || '');
      return {
        ...state,
        coverLetterData: {
          ...state.coverLetterData,
          header: autoHeader,
          content: autoMergedContent
        }
      };

    case 'LOAD_COVER_LETTER':
      const loadedData = action.payload.coverLetterData;
      // Extract header and body if not present
      let header = loadedData.header;
      let body = loadedData.body;
      
      if (!header || !body) {
        header = header || extractHeaderFromContent(loadedData.content);
        body = body || extractBodyFromContent(loadedData.content);
      }
      
      return {
        ...state,
        mode: 'edit',
        currentStep: 1, // Start at template selection
        coverLetterId: action.payload.coverLetterId,
        coverLetterTitle: loadedData.title,
        coverLetterData: {
          ...loadedData,
          header,
          body
        },
        selectedTemplate: action.payload.template || state.selectedTemplate,
        cvData: action.payload.cvData || state.cvData,
        jobData: action.payload.jobData || state.jobData,
        journeyId: action.payload.journeyId,
        saveStatus: 'idle'
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
interface CoverLetterEditorContextType {
  state: CoverLetterEditorState;
  dispatch: React.Dispatch<CoverLetterEditorAction>;
  
  // Helper functions
  goToStep: (step: 1 | 2 | 3) => void;
  nextStep: () => void;
  prevStep: () => void;
  updateCoverLetter: (data: Partial<CoverLetterData>) => void;
  updateHeader: (header: string) => void;
  updateBody: (body: string) => void;
  setTemplate: (template: CoverLetterTemplate | null) => void;
  setCVData: (cvData: UnifiedCVDataStructure | null) => void;
  setJobData: (jobData: any) => void;
  loadCoverLetter: (data: { coverLetterId: string; coverLetterData: CoverLetterData; template?: CoverLetterTemplate; cvData?: UnifiedCVDataStructure; jobData?: any; journeyId?: string }) => void;
  autoPopulateHeader: () => void;
  resetState: () => void;
}

const CoverLetterEditorContext = createContext<CoverLetterEditorContextType | null>(null);

// Provider
export function CoverLetterEditorProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(coverLetterEditorReducer, initialState);

  // Helper functions
  const goToStep = (step: 1 | 2 | 3) => {
    dispatch({ type: 'SET_STEP', payload: step });
  };

  const nextStep = () => {
    const next = Math.min(3, (state.currentStep + 1)) as 1 | 2 | 3;
    dispatch({ type: 'SET_STEP', payload: next });
  };

  const prevStep = () => {
    const prev = Math.max(1, (state.currentStep - 1)) as 1 | 2 | 3;
    dispatch({ type: 'SET_STEP', payload: prev });
  };

  const updateCoverLetter = (data: Partial<CoverLetterData>) => {
    dispatch({ type: 'UPDATE_COVER_LETTER_DATA', payload: data });
  };

  const updateHeader = (header: string) => {
    dispatch({ type: 'UPDATE_HEADER', payload: header });
  };

  const updateBody = (body: string) => {
    dispatch({ type: 'UPDATE_BODY', payload: body });
  };

  const setTemplate = (template: CoverLetterTemplate | null) => {
    dispatch({ type: 'SET_TEMPLATE', payload: template });
  };

  const setCVData = (cvData: UnifiedCVDataStructure | null) => {
    dispatch({ type: 'SET_CV_DATA', payload: cvData });
  };

  const setJobData = (jobData: any) => {
    dispatch({ type: 'SET_JOB_DATA', payload: jobData });
  };

  const loadCoverLetter = (data: { coverLetterId: string; coverLetterData: CoverLetterData; template?: CoverLetterTemplate; cvData?: UnifiedCVDataStructure; jobData?: any; journeyId?: string }) => {
    dispatch({ type: 'LOAD_COVER_LETTER', payload: data });
  };

  const autoPopulateHeader = () => {
    dispatch({ type: 'AUTO_POPULATE_HEADER' });
  };

  const resetState = () => {
    dispatch({ type: 'RESET_STATE' });
  };

  const contextValue: CoverLetterEditorContextType = {
    state,
    dispatch,
    goToStep,
    nextStep,
    prevStep,
    updateCoverLetter,
    updateHeader,
    updateBody,
    setTemplate,
    setCVData,
    setJobData,
    loadCoverLetter,
    autoPopulateHeader,
    resetState
  };

  return (
    <CoverLetterEditorContext.Provider value={contextValue}>
      {children}
    </CoverLetterEditorContext.Provider>
  );
}

// Hook to use context
export function useCoverLetterEditor() {
  const context = useContext(CoverLetterEditorContext);
  if (!context) {
    throw new Error('useCoverLetterEditor must be used within CoverLetterEditorProvider');
  }
  return context;
}

