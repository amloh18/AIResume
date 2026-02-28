'use client';

import React, { createContext, useContext, useReducer, ReactNode } from 'react';

// Step type
export type StepNumber = 1 | 2 | 3 | 4;

// Mode type
export type AppMode = 'create' | 'edit' | 'edit-master' | 'journey';

// State Interface - focused only on navigation and flow
export interface NavigationState {
  // Current navigation
  currentStep: StepNumber;
  mode: AppMode;
  
  // Journey context
  journeyId?: string;
  jobId?: string;
  
  // Step completion tracking
  completedSteps: number[];
  
  // Loading states
  isLoading: boolean;
  loadingMessage?: string;
  
  // Error state
  error: string | null;
}

// Action Types
type NavigationAction =
  | { type: 'SET_STEP'; payload: StepNumber }
  | { type: 'SET_MODE'; payload: AppMode }
  | { type: 'SET_JOURNEY_ID'; payload: string }
  | { type: 'SET_JOB_ID'; payload: string }
  | { type: 'MARK_STEP_COMPLETE'; payload: number }
  | { type: 'SET_LOADING'; payload: { isLoading: boolean; message?: string } }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'RESET_NAVIGATION' };

// Initial State
const initialNavigationState: NavigationState = {
  currentStep: 1,
  mode: 'create',
  journeyId: undefined,
  jobId: undefined,
  completedSteps: [],
  isLoading: false,
  loadingMessage: undefined,
  error: null,
};

// Reducer
function navigationReducer(state: NavigationState, action: NavigationAction): NavigationState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.payload };
    
    case 'SET_MODE':
      return { ...state, mode: action.payload };
    
    case 'SET_JOURNEY_ID':
      return { ...state, journeyId: action.payload };
    
    case 'SET_JOB_ID':
      return { ...state, jobId: action.payload };
    
    case 'MARK_STEP_COMPLETE':
      if (state.completedSteps.includes(action.payload)) {
        return state;
      }
      return {
        ...state,
        completedSteps: [...state.completedSteps, action.payload].sort()
      };
    
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload.isLoading,
        loadingMessage: action.payload.message
      };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'NEXT_STEP':
      if (state.currentStep < 4) {
        return {
          ...state,
          currentStep: ((state.currentStep + 1) as StepNumber)
        };
      }
      return state;
    
    case 'PREV_STEP':
      if (state.currentStep > 1) {
        return {
          ...state,
          currentStep: ((state.currentStep - 1) as StepNumber)
        };
      }
      return state;
    
    case 'RESET_NAVIGATION':
      return initialNavigationState;
    
    default:
      return state;
  }
}

// Context
interface NavigationContextType {
  state: NavigationState;
  dispatch: React.Dispatch<NavigationAction>;
  
  // Convenience methods
  setStep: (step: StepNumber) => void;
  setMode: (mode: AppMode) => void;
  setJourneyId: (id: string) => void;
  setJobId: (id: string) => void;
  markStepComplete: (step: number) => void;
  setLoading: (isLoading: boolean, message?: string) => void;
  setError: (error: string | null) => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: StepNumber) => void;
  isStepComplete: (step: number) => boolean;
}

const NavigationContext = createContext<NavigationContextType | null>(null);

// Provider
export function NavigationProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(navigationReducer, initialNavigationState);

  const setStep = (step: StepNumber) => dispatch({ type: 'SET_STEP', payload: step });
  const setMode = (mode: AppMode) => dispatch({ type: 'SET_MODE', payload: mode });
  const setJourneyId = (id: string) => dispatch({ type: 'SET_JOURNEY_ID', payload: id });
  const setJobId = (id: string) => dispatch({ type: 'SET_JOB_ID', payload: id });
  const markStepComplete = (step: number) => dispatch({ type: 'MARK_STEP_COMPLETE', payload: step });
  const setLoading = (isLoading: boolean, message?: string) => 
    dispatch({ type: 'SET_LOADING', payload: { isLoading, message } });
  const setError = (error: string | null) => dispatch({ type: 'SET_ERROR', payload: error });
  const nextStep = () => dispatch({ type: 'NEXT_STEP' });
  const prevStep = () => dispatch({ type: 'PREV_STEP' });
  const goToStep = (step: StepNumber) => dispatch({ type: 'SET_STEP', payload: step });
  const isStepComplete = (step: number) => state.completedSteps.includes(step);

  const contextValue: NavigationContextType = {
    state,
    dispatch,
    setStep,
    setMode,
    setJourneyId,
    setJobId,
    markStepComplete,
    setLoading,
    setError,
    nextStep,
    prevStep,
    goToStep,
    isStepComplete,
  };

  return (
    <NavigationContext.Provider value={contextValue}>
      {children}
    </NavigationContext.Provider>
  );
}

// Hook to use context
export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }
  return context;
}

// Export for testing
export { NavigationContext };
