'use client';

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { UnifiedCVDataStructure, DEFAULT_UNIFIED_CV_DATA } from '@/types/unified-cv-schema';
import { ITemplate } from '@/types/template';
import { type DateFormatStyle } from '@/lib/utils/textFormatting';
import { type PaperSize } from '@/lib/services/paperSizeService';

// State Interface - focused only on CV data and template
export interface CVDataState {
  // CV identification
  cvId?: string;
  cvType: 'master' | 'journey' | 'standalone';
  cvTitle: string;

  // CV data
  cvData: UnifiedCVDataStructure;

  // Template
  selectedTemplate: ITemplate | null;

  // Formatting options
  dateFormat: DateFormatStyle;
  paperSize: PaperSize;

  // Save state
  isSaving: boolean;
  saveError: string | null;
}

// Action Types
type CVDataAction =
  | { type: 'SET_CV_ID'; payload: string }
  | { type: 'SET_CV_TYPE'; payload: 'master' | 'journey' | 'standalone' }
  | { type: 'SET_CV_TITLE'; payload: string }
  | { type: 'SET_CV_DATA'; payload: UnifiedCVDataStructure }
  | { type: 'UPDATE_CV_SECTION'; payload: { section: string; data: any } }
  | { type: 'SET_TEMPLATE'; payload: ITemplate | null }
  | { type: 'SET_DATE_FORMAT'; payload: DateFormatStyle }
  | { type: 'SET_PAPER_SIZE'; payload: PaperSize }
  | { type: 'SET_SAVING'; payload: boolean }
  | { type: 'SET_SAVE_ERROR'; payload: string | null }
  | { type: 'RESET_CV_DATA' };

// Initial State
const initialCVDataState: CVDataState = {
  cvId: undefined,
  cvType: 'standalone',
  cvTitle: 'My CV',
  cvData: DEFAULT_UNIFIED_CV_DATA,
  selectedTemplate: null,
  dateFormat: 'MMM_YYYY',
  paperSize: 'A4',
  isSaving: false,
  saveError: null,
};

// Reducer
function cvDataReducer(state: CVDataState, action: CVDataAction): CVDataState {
  switch (action.type) {
    case 'SET_CV_ID':
      return { ...state, cvId: action.payload };
    
    case 'SET_CV_TYPE':
      return { ...state, cvType: action.payload };
    
    case 'SET_CV_TITLE':
      return { ...state, cvTitle: action.payload };
    
    case 'SET_CV_DATA':
      return { ...state, cvData: action.payload };
    
    case 'UPDATE_CV_SECTION':
      return {
        ...state,
        cvData: {
          ...state.cvData,
          [action.payload.section]: action.payload.data
        }
      };
    
    case 'SET_TEMPLATE':
      return { ...state, selectedTemplate: action.payload };
    
    case 'SET_DATE_FORMAT':
      return { ...state, dateFormat: action.payload };
    
    case 'SET_PAPER_SIZE':
      return { ...state, paperSize: action.payload };
    
    case 'SET_SAVING':
      return { ...state, isSaving: action.payload };
    
    case 'SET_SAVE_ERROR':
      return { ...state, saveError: action.payload };
    
    case 'RESET_CV_DATA':
      return initialCVDataState;
    
    default:
      return state;
  }
}

// Context
interface CVDataContextType {
  state: CVDataState;
  dispatch: React.Dispatch<CVDataAction>;
  
  // Convenience methods
  setCVId: (id: string) => void;
  setCVType: (type: 'master' | 'journey' | 'standalone') => void;
  setCVTitle: (title: string) => void;
  setCVData: (data: UnifiedCVDataStructure) => void;
  updateCVSection: (section: string, data: any) => void;
  setTemplate: (template: ITemplate | null) => void;
  setDateFormat: (format: DateFormatStyle) => void;
  setPaperSize: (size: PaperSize) => void;
}

const CVDataContext = createContext<CVDataContextType | null>(null);

// Provider
export function CVDataProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cvDataReducer, initialCVDataState);

  const setCVId = (id: string) => dispatch({ type: 'SET_CV_ID', payload: id });
  const setCVType = (type: 'master' | 'journey' | 'standalone') => dispatch({ type: 'SET_CV_TYPE', payload: type });
  const setCVTitle = (title: string) => dispatch({ type: 'SET_CV_TITLE', payload: title });
  const setCVData = (data: UnifiedCVDataStructure) => dispatch({ type: 'SET_CV_DATA', payload: data });
  const updateCVSection = (section: string, data: any) => dispatch({ type: 'UPDATE_CV_SECTION', payload: { section, data } });
  const setTemplate = (template: ITemplate | null) => dispatch({ type: 'SET_TEMPLATE', payload: template });
  const setDateFormat = (format: DateFormatStyle) => dispatch({ type: 'SET_DATE_FORMAT', payload: format });
  const setPaperSize = (size: PaperSize) => dispatch({ type: 'SET_PAPER_SIZE', payload: size });

  const contextValue: CVDataContextType = {
    state,
    dispatch,
    setCVId,
    setCVType,
    setCVTitle,
    setCVData,
    updateCVSection,
    setTemplate,
    setDateFormat,
    setPaperSize,
  };

  return (
    <CVDataContext.Provider value={contextValue}>
      {children}
    </CVDataContext.Provider>
  );
}

// Hook to use context
export function useCVData() {
  const context = useContext(CVDataContext);
  if (!context) {
    throw new Error('useCVData must be used within CVDataProvider');
  }
  return context;
}

// Export for testing
export { CVDataContext };