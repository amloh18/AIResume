'use client';

import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import type { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import type { FixAnnotation } from '@/components/resume-enhancer/annotations/fix-annotation';
import type { StudioViewMode, ATSPillar, PillarScores, SectionAnalysis, StudioAnnotation } from '@/types/studio';

// ============================================================================
// State Types
// ============================================================================

export interface StudioState {
    // View Mode
    viewMode: StudioViewMode;

    // Current Step (1=Import, 2=Template, 3=Edit, 4=Export)
    currentStep: 1 | 2 | 3 | 4;

    // CV Type (master, journey, standalone)
    cvType: 'master' | 'journey' | 'standalone';

    // CV Data
    cvData: UnifiedCVDataStructure | null;
    cvId: string | null;
    cvTitle: string;

    // Job/Journey Context
    journeyId: string | null;
    jobData: any | null;

    // Active Section (for workbench)
    activeSection: string | null;
    activePillar: ATSPillar | null;

    // Annotations
    annotations: StudioAnnotation[];
    activeAnnotationId: string | null;

    // Fix Annotations (for CV Surgeon)
    fixAnnotations: FixAnnotation[];
    activeFixId: string | null;
    targetRole: string;
    seniorityLevel: string;

    // Scores
    cvScore: number;
    atsScore: number | null;
    pillarScores: PillarScores;
    sectionAnalyses: SectionAnalysis[];

    // UI State
    sidebarCollapsed: boolean;
    previewZoom: number;
    previewViewType: 'normal' | 'recruiter' | 'robot';
    showAnnotations: boolean;

    // Loading States
    isLoading: boolean;
    isSaving: boolean;
    isAnalyzing: boolean;

    // Theme
    theme: 'light' | 'dark' | 'system';

    // Errors
    error: string | null;
}

const initialPillarScores: PillarScores = {
    completeness: 0,
    impactVerbs: 0,
    quantification: 0,
    formatting: 0,
    readability: 0,
};

const initialState: StudioState = {
    viewMode: 'default',
    currentStep: 1,
    cvType: 'standalone',
    cvData: null,
    cvId: null,
    cvTitle: 'Untitled CV',
    journeyId: null,
    jobData: null,
    activeSection: null,
    activePillar: null,
    annotations: [],
    activeAnnotationId: null,
    fixAnnotations: [],
    activeFixId: null,
    targetRole: '',
    seniorityLevel: '',
    cvScore: 0,
    atsScore: null,
    pillarScores: initialPillarScores,
    sectionAnalyses: [],
    sidebarCollapsed: false,
    previewZoom: 100,
    previewViewType: 'normal',
    showAnnotations: true,
    isLoading: true,
    isSaving: false,
    isAnalyzing: false,
    theme: 'system',
    error: null,
};

// ============================================================================
// Action Types
// ============================================================================

type StudioAction =
    | { type: 'SET_VIEW_MODE'; payload: StudioViewMode }
    | { type: 'SET_CURRENT_STEP'; payload: 1 | 2 | 3 | 4 }
    | { type: 'SET_CV_TYPE'; payload: 'master' | 'journey' | 'standalone' }
    | { type: 'SET_CV_DATA'; payload: UnifiedCVDataStructure }
    | { type: 'SET_CV_ID'; payload: string }
    | { type: 'SET_CV_TITLE'; payload: string }
    | { type: 'SET_JOURNEY_ID'; payload: string | null }
    | { type: 'SET_JOB_DATA'; payload: any }
    | { type: 'SET_ACTIVE_SECTION'; payload: string | null }
    | { type: 'SET_ACTIVE_PILLAR'; payload: ATSPillar | null }
    | { type: 'SET_ANNOTATIONS'; payload: StudioAnnotation[] }
    | { type: 'SET_ACTIVE_ANNOTATION'; payload: string | null }
    | { type: 'APPLY_ANNOTATION'; payload: string }
    | { type: 'DISMISS_ANNOTATION'; payload: string }
    | { type: 'SET_FIX_ANNOTATIONS'; payload: FixAnnotation[] }
    | { type: 'SET_ACTIVE_FIX'; payload: string | null }
    | { type: 'MARK_FIX_APPLIED'; payload: string }
    | { type: 'MARK_FIX_DISMISSED'; payload: string }
    | { type: 'SET_TARGET_ROLE'; payload: string }
    | { type: 'SET_SENIORITY_LEVEL'; payload: string }
    | { type: 'SET_CV_SCORE'; payload: number }
    | { type: 'SET_ATS_SCORE'; payload: number | null }
    | { type: 'SET_PILLAR_SCORES'; payload: PillarScores }
    | { type: 'SET_SECTION_ANALYSES'; payload: SectionAnalysis[] }
    | { type: 'TOGGLE_SIDEBAR' }
    | { type: 'SET_PREVIEW_ZOOM'; payload: number }
    | { type: 'SET_PREVIEW_VIEW_TYPE'; payload: 'normal' | 'recruiter' | 'robot' }
    | { type: 'TOGGLE_ANNOTATIONS' }
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_SAVING'; payload: boolean }
    | { type: 'SET_ANALYZING'; payload: boolean }
    | { type: 'SET_THEME'; payload: 'light' | 'dark' | 'system' }
    | { type: 'SET_ERROR'; payload: string | null }
    | { type: 'INITIALIZE'; payload: Partial<StudioState> };

// ============================================================================
// Reducer
// ============================================================================

function studioReducer(state: StudioState, action: StudioAction): StudioState {
    switch (action.type) {
        case 'SET_VIEW_MODE':
            return { ...state, viewMode: action.payload };

        case 'SET_CURRENT_STEP':
            return { ...state, currentStep: action.payload };

        case 'SET_CV_TYPE':
            return { ...state, cvType: action.payload };

        case 'SET_CV_DATA':
            return { ...state, cvData: action.payload };

        case 'SET_CV_ID':
            return { ...state, cvId: action.payload };

        case 'SET_CV_TITLE':
            return { ...state, cvTitle: action.payload };

        case 'SET_JOURNEY_ID':
            return { ...state, journeyId: action.payload };

        case 'SET_JOB_DATA':
            return { ...state, jobData: action.payload };

        case 'SET_ACTIVE_SECTION':
            return { ...state, activeSection: action.payload };

        case 'SET_ACTIVE_PILLAR':
            return { ...state, activePillar: action.payload };

        case 'SET_ANNOTATIONS':
            return { ...state, annotations: action.payload };

        case 'SET_ACTIVE_ANNOTATION':
            return { ...state, activeAnnotationId: action.payload };

        case 'APPLY_ANNOTATION':
            return {
                ...state,
                annotations: state.annotations.map(a =>
                    a.id === action.payload ? { ...a, status: 'applied' as const } : a
                ),
            };

        case 'DISMISS_ANNOTATION':
            return {
                ...state,
                annotations: state.annotations.map(a =>
                    a.id === action.payload ? { ...a, status: 'dismissed' as const } : a
                ),
            };

        case 'SET_FIX_ANNOTATIONS':
            return { ...state, fixAnnotations: action.payload };

        case 'SET_ACTIVE_FIX':
            return { ...state, activeFixId: action.payload };

        case 'MARK_FIX_APPLIED':
            return {
                ...state,
                fixAnnotations: state.fixAnnotations.map(f =>
                    f.id === action.payload ? { ...f, status: 'applied' as const } : f
                ),
            };

        case 'MARK_FIX_DISMISSED':
            return {
                ...state,
                fixAnnotations: state.fixAnnotations.map(f =>
                    f.id === action.payload ? { ...f, status: 'dismissed' as const } : f
                ),
            };

        case 'SET_TARGET_ROLE':
            return { ...state, targetRole: action.payload };

        case 'SET_SENIORITY_LEVEL':
            return { ...state, seniorityLevel: action.payload };

        case 'SET_CV_SCORE':
            return { ...state, cvScore: action.payload };

        case 'SET_ATS_SCORE':
            return { ...state, atsScore: action.payload };

        case 'SET_PILLAR_SCORES':
            return { ...state, pillarScores: action.payload };

        case 'SET_SECTION_ANALYSES':
            return { ...state, sectionAnalyses: action.payload };

        case 'TOGGLE_SIDEBAR':
            return { ...state, sidebarCollapsed: !state.sidebarCollapsed };

        case 'SET_PREVIEW_ZOOM':
            return { ...state, previewZoom: action.payload };

        case 'SET_PREVIEW_VIEW_TYPE':
            return { ...state, previewViewType: action.payload };

        case 'TOGGLE_ANNOTATIONS':
            return { ...state, showAnnotations: !state.showAnnotations };

        case 'SET_LOADING':
            return { ...state, isLoading: action.payload };

        case 'SET_SAVING':
            return { ...state, isSaving: action.payload };

        case 'SET_ANALYZING':
            return { ...state, isAnalyzing: action.payload };

        case 'SET_THEME':
            return { ...state, theme: action.payload };

        case 'SET_ERROR':
            return { ...state, error: action.payload };

        case 'INITIALIZE':
            return { ...state, ...action.payload, isLoading: false };

        default:
            return state;
    }
}

// ============================================================================
// Context
// ============================================================================

interface StudioContextValue {
    state: StudioState;
    dispatch: React.Dispatch<StudioAction>;

    // Convenience Actions
    enterATSFixMode: () => void;
    exitATSFixMode: () => void;
    selectAnnotation: (annotationId: string) => void;
    applyAnnotation: (annotationId: string, newText: string) => void;
    dismissAnnotation: (annotationId: string) => void;
    filterByPillar: (pillar: ATSPillar | null) => void;
    navigateToSection: (sectionId: string) => void;
    setPreviewView: (view: 'normal' | 'recruiter' | 'robot') => void;

    // Step Navigation
    goToStep: (step: 1 | 2 | 3 | 4) => void;
    nextStep: () => void;
    prevStep: () => void;
    setCvType: (cvType: 'master' | 'journey' | 'standalone') => void;
}

const StudioContext = createContext<StudioContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

interface StudioProviderProps {
    children: ReactNode;
    initialData?: Partial<StudioState>;
}

export function StudioProvider({ children, initialData }: StudioProviderProps) {
    const [state, dispatch] = useReducer(studioReducer, {
        ...initialState,
        ...initialData,
    });

    // Convenience action: Enter ATS Fix Mode
    const enterATSFixMode = useCallback(() => {
        dispatch({ type: 'SET_VIEW_MODE', payload: 'ats-fix' });
        // Select first open annotation if none selected
        const firstOpen = state.annotations.find(a => a.status === 'open');
        if (firstOpen && !state.activeAnnotationId) {
            dispatch({ type: 'SET_ACTIVE_ANNOTATION', payload: firstOpen.id });
            dispatch({ type: 'SET_ACTIVE_SECTION', payload: firstOpen.sectionId });
        }
    }, [state.annotations, state.activeAnnotationId]);

    // Convenience action: Exit ATS Fix Mode
    const exitATSFixMode = useCallback(() => {
        dispatch({ type: 'SET_VIEW_MODE', payload: 'default' });
        dispatch({ type: 'SET_ACTIVE_ANNOTATION', payload: null });
    }, []);

    // Select an annotation
    const selectAnnotation = useCallback((annotationId: string) => {
        const annotation = state.annotations.find(a => a.id === annotationId);
        if (annotation) {
            dispatch({ type: 'SET_ACTIVE_ANNOTATION', payload: annotationId });
            dispatch({ type: 'SET_ACTIVE_SECTION', payload: annotation.sectionId });
        }
    }, [state.annotations]);

    // Apply an annotation
    const applyAnnotation = useCallback((annotationId: string, newText: string) => {
        dispatch({ type: 'APPLY_ANNOTATION', payload: annotationId });
        // TODO: Update CV data with newText
    }, []);

    // Dismiss an annotation
    const dismissAnnotation = useCallback((annotationId: string) => {
        dispatch({ type: 'DISMISS_ANNOTATION', payload: annotationId });
        // Move to next open annotation
        const remaining = state.annotations.filter(
            a => a.id !== annotationId && a.status === 'open'
        );
        if (remaining.length > 0) {
            dispatch({ type: 'SET_ACTIVE_ANNOTATION', payload: remaining[0].id });
        } else {
            dispatch({ type: 'SET_ACTIVE_ANNOTATION', payload: null });
        }
    }, [state.annotations]);

    // Filter by pillar
    const filterByPillar = useCallback((pillar: ATSPillar | null) => {
        dispatch({ type: 'SET_ACTIVE_PILLAR', payload: pillar });
    }, []);

    // Navigate to section
    const navigateToSection = useCallback((sectionId: string) => {
        dispatch({ type: 'SET_ACTIVE_SECTION', payload: sectionId });
    }, []);

    // Set preview view
    const setPreviewView = useCallback((view: 'normal' | 'recruiter' | 'robot') => {
        dispatch({ type: 'SET_PREVIEW_VIEW_TYPE', payload: view });
    }, []);

    // Step Navigation
    const goToStep = useCallback((step: 1 | 2 | 3 | 4) => {
        dispatch({ type: 'SET_CURRENT_STEP', payload: step });
    }, []);

    const nextStep = useCallback(() => {
        if (state.currentStep < 4) {
            dispatch({ type: 'SET_CURRENT_STEP', payload: (state.currentStep + 1) as 1 | 2 | 3 | 4 });
        }
    }, [state.currentStep]);

    const prevStep = useCallback(() => {
        if (state.currentStep > 1) {
            dispatch({ type: 'SET_CURRENT_STEP', payload: (state.currentStep - 1) as 1 | 2 | 3 | 4 });
        }
    }, [state.currentStep]);

    const setCvType = useCallback((cvType: 'master' | 'journey' | 'standalone') => {
        dispatch({ type: 'SET_CV_TYPE', payload: cvType });
    }, []);

    const value: StudioContextValue = {
        state,
        dispatch,
        enterATSFixMode,
        exitATSFixMode,
        selectAnnotation,
        applyAnnotation,
        dismissAnnotation,
        filterByPillar,
        navigateToSection,
        setPreviewView,
        goToStep,
        nextStep,
        prevStep,
        setCvType,
    };

    return (
        <StudioContext.Provider value={value}>
            {children}
        </StudioContext.Provider>
    );
}

// ============================================================================
// Hook
// ============================================================================

export function useStudio() {
    const context = useContext(StudioContext);
    if (!context) {
        throw new Error('useStudio must be used within a StudioProvider');
    }
    return context;
}

export default StudioContext;
