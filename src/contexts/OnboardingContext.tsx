'use client';

import React, { createContext, useContext, useReducer, ReactNode, useCallback } from 'react';
import { UnifiedCVDataStructure, OnboardingStep, UserRole } from '@/types/cv';

interface OnboardingState {
  currentStep: number;
  selectedRole: UserRole | null;
  cvData: UnifiedCVDataStructure;
  isAuthenticated: boolean;
  userData: any;
  isLoading: boolean;
  prefilledFromSignup: boolean;
  error: string | null;
  steps: OnboardingStep[];
}

type OnboardingAction =
  | { type: 'SET_CURRENT_STEP'; payload: number }
  | { type: 'SET_SELECTED_ROLE'; payload: UserRole }
  | { type: 'UPDATE_CV_DATA'; payload: Partial<UnifiedCVDataStructure> }
  | { type: 'SET_CV_DATA'; payload: UnifiedCVDataStructure }
  | { type: 'SET_AUTHENTICATED'; payload: boolean }
  | { type: 'SET_USER_DATA'; payload: any }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_PREFILLED_FROM_SIGNUP'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'COMPLETE_STEP'; payload: number }
  | { type: 'RESET_ONBOARDING' };

const initialState: OnboardingState = {
  currentStep: 0,
  selectedRole: null,
  cvData: {
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
  isAuthenticated: false,
  userData: null,
  isLoading: false,
  prefilledFromSignup: false,
  error: null,
  steps: [
    { id: 'role', title: 'Choose Your Role', description: 'Select your professional role', isCompleted: false, isActive: true },
    { id: 'auth', title: 'Create Account', description: 'Sign up or log in to continue', isCompleted: false, isActive: false },
    { id: 'basics', title: 'Personal Information', description: 'Tell us about yourself', isCompleted: false, isActive: false },
    { id: 'experience', title: 'Work Experience', description: 'Add your professional experience', isCompleted: false, isActive: false },
    { id: 'education', title: 'Education & Skills', description: 'Add your education and skills', isCompleted: false, isActive: false },
    { id: 'complete', title: 'Complete Setup', description: 'Review and finish setup', isCompleted: false, isActive: false }
  ]
};

function onboardingReducer(state: OnboardingState, action: OnboardingAction): OnboardingState {
  switch (action.type) {
    case 'SET_CURRENT_STEP':
      return {
        ...state,
        currentStep: action.payload,
        steps: state.steps.map((step, index) => ({
          ...step,
          isActive: index === action.payload,
          isCompleted: index < action.payload
        }))
      };
    
    case 'SET_SELECTED_ROLE':
      return {
        ...state,
        selectedRole: action.payload
      };
    
    case 'UPDATE_CV_DATA':
      return {
        ...state,
        cvData: { ...state.cvData, ...action.payload }
      };
    
    case 'SET_CV_DATA':
      return {
        ...state,
        cvData: action.payload
      };
    
    case 'SET_AUTHENTICATED':
      return {
        ...state,
        isAuthenticated: action.payload
      };
    
    case 'SET_USER_DATA':
      return {
        ...state,
        userData: action.payload
      };
    
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      };
    
    case 'SET_PREFILLED_FROM_SIGNUP':
      return {
        ...state,
        prefilledFromSignup: action.payload
      };
    
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload
      };
    
    case 'COMPLETE_STEP':
      return {
        ...state,
        steps: state.steps.map((step, index) => ({
          ...step,
          isCompleted: index <= action.payload
        }))
      };
    
    case 'RESET_ONBOARDING':
      return initialState;
    
    default:
      return state;
  }
}

interface OnboardingContextType {
  state: OnboardingState;
  dispatch: React.Dispatch<OnboardingAction>;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(onboardingReducer, initialState);

  const nextStep = useCallback(() => {
    if (state.currentStep < state.steps.length - 1) {
      dispatch({ type: 'SET_CURRENT_STEP', payload: state.currentStep + 1 });
    }
  }, [state.currentStep, state.steps.length]);

  const prevStep = useCallback(() => {
    if (state.currentStep > 0) {
      dispatch({ type: 'SET_CURRENT_STEP', payload: state.currentStep - 1 });
    }
  }, [state.currentStep]);

  const goToStep = useCallback((step: number) => {
    if (step >= 0 && step < state.steps.length) {
      dispatch({ type: 'SET_CURRENT_STEP', payload: step });
    }
  }, [state.steps.length]);

  return (
    <OnboardingContext.Provider value={{ state, dispatch, nextStep, prevStep, goToStep }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}
