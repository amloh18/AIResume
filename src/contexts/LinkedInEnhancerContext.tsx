'use client';

import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import type {
    LinkedInEnhancerState,
    LinkedInUserContext,
    LinkedInProfileSections,
    LinkedInSideCards,
    LinkedInAudit,
    LinkedInCareerGuide,
    CVSelectionItem,
} from '@/types/linkedin';

// Initial state
const initialState: LinkedInEnhancerState = {
    version: '2026.1',
    isLoading: true,
    isEnhancing: false,
    showEnhancingOverlay: false, // Only show overlay on regenerate, not initial load
    error: null,
    user_context: {
        tone_selection: 'Professional',
        target_industry: '',
        career_goal: '',
    },
    sections: {
        hero: {
            status: 'default',
            current: {
                headline: '',
                location: '',
                name: '',
                photoUrl: '',
                bannerUrl: '',
                connections: '',
            },
            enhanced: {
                headline: '',
                seo_keywords_used: [],
                location_suggestion: '',
                rationale: '',
            },
        },
        about: {
            status: 'default',
            current: '',
            enhanced: {
                hook: '',
                body: '',
                cta: '',
                character_count: 0,
                narrative_strategy: '',
            },
        },
        experience: [],
        education: [],
        projects: [],
        skills_matrix: {
            current: [],
            suggested_additions: [],
            verified_badges_eligible: [],
            top_3_priority: [],
            industry_specific: [],
            interpersonal: [],
        },
        languages: {
            languages: [],
        },
    },
    side_cards: {
        affiliate_courses: [],
        networking: [],
        career_pathway: {
            next_step: '',
            missing_skill: '',
        },
        profile_strength_score: 0,
        skill_gap_analysis: '',
        recommended_actions: [],
    },
    audit: null,
    career_guide: null,
    selectedCvId: null,
    selectedCvType: null,
};

// Action types
type Action =
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_ENHANCING'; payload: boolean }
    | { type: 'SET_SHOW_ENHANCING_OVERLAY'; payload: boolean }
    | { type: 'SET_ERROR'; payload: string | null }
    | { type: 'SET_USER_CONTEXT'; payload: Partial<LinkedInUserContext> }
    | { type: 'SET_SECTIONS'; payload: LinkedInProfileSections }
    | { type: 'SET_SIDE_CARDS'; payload: LinkedInSideCards }
    | { type: 'SET_AUDIT'; payload: LinkedInAudit }
    | { type: 'SET_CAREER_GUIDE'; payload: LinkedInCareerGuide }
    | { type: 'SET_SELECTED_CV'; payload: { id: string; type: 'master' | 'standalone' } }
    | { type: 'SET_ENHANCED_DATA'; payload: { sections: Partial<LinkedInProfileSections>; side_cards: Partial<LinkedInSideCards>; audit?: LinkedInAudit; career_guide?: LinkedInCareerGuide } }
    | { type: 'LOAD_CV_DATA'; payload: { sections: LinkedInProfileSections; cvId: string; cvType: 'master' | 'standalone' } }
    | { type: 'RESET_STATE' };

// Reducer
function reducer(state: LinkedInEnhancerState, action: Action): LinkedInEnhancerState {
    switch (action.type) {
        case 'SET_LOADING':
            return { ...state, isLoading: action.payload };
        case 'SET_ENHANCING':
            return { ...state, isEnhancing: action.payload };
        case 'SET_SHOW_ENHANCING_OVERLAY':
            return { ...state, showEnhancingOverlay: action.payload };
        case 'SET_ERROR':
            return { ...state, error: action.payload };
        case 'SET_USER_CONTEXT':
            return { ...state, user_context: { ...state.user_context, ...action.payload } };
        case 'SET_SECTIONS':
            return { ...state, sections: action.payload };
        case 'SET_SIDE_CARDS':
            return { ...state, side_cards: action.payload };
        case 'SET_AUDIT':
            return { ...state, audit: action.payload };
        case 'SET_CAREER_GUIDE':
            return { ...state, career_guide: action.payload };
        case 'SET_SELECTED_CV':
            return { ...state, selectedCvId: action.payload.id, selectedCvType: action.payload.type };
        case 'SET_ENHANCED_DATA': {
            // Merge experience arrays - match by ID to preserve original_data while adding enhanced_data
            const mergedExperience = state.sections.experience.map((exp, idx) => {
                // Find matching enhanced data by ID or index
                const enhanced = action.payload.sections?.experience?.find(
                    (e: any) => e.id === exp.id
                ) || action.payload.sections?.experience?.[idx];
                
                if (enhanced?.enhanced_data) {
                    return {
                        ...exp,
                        enhanced_data: enhanced.enhanced_data,
                    };
                }
                return exp;
            });

            // Merge projects arrays - same logic
            const mergedProjects = state.sections.projects.map((proj, idx) => {
                const enhanced = action.payload.sections?.projects?.find(
                    (p: any) => p.id === proj.id
                ) || action.payload.sections?.projects?.[idx];
                
                if (enhanced?.enhanced_data) {
                    return {
                        ...proj,
                        enhanced_data: enhanced.enhanced_data,
                    };
                }
                return proj;
            });

            return {
                ...state,
                sections: {
                    ...state.sections,
                    hero: {
                        ...state.sections.hero,
                        ...action.payload.sections?.hero,
                        status: 'suggestion_available',
                    },
                    about: {
                        ...state.sections.about,
                        ...action.payload.sections?.about,
                        status: 'suggestion_available',
                    },
                    experience: mergedExperience,
                    projects: mergedProjects,
                    skills_matrix: {
                        ...state.sections.skills_matrix,
                        ...action.payload.sections?.skills_matrix,
                    },
                },
                side_cards: { ...state.side_cards, ...action.payload.side_cards },
                audit: action.payload.audit || state.audit,
                career_guide: action.payload.career_guide || state.career_guide,
                isEnhancing: false,
                showEnhancingOverlay: false,
            };
        }
        case 'LOAD_CV_DATA':
            return {
                ...state,
                sections: action.payload.sections,
                selectedCvId: action.payload.cvId,
                selectedCvType: action.payload.cvType,
                isLoading: false,
            };
        case 'RESET_STATE':
            return initialState;
        default:
            return state;
    }
}

// Context type
interface LinkedInEnhancerContextType {
    state: LinkedInEnhancerState;
    dispatch: React.Dispatch<Action>;
    setTone: (tone: LinkedInUserContext['tone_selection']) => void;
    setTargetIndustry: (industry: string) => void;
    selectCv: (id: string, type: 'master' | 'standalone') => void;
    triggerEnhancement: (cvId?: string, cvType?: 'master' | 'standalone', regenerate?: boolean) => Promise<void>;
}

const LinkedInEnhancerContext = createContext<LinkedInEnhancerContextType | null>(null);

// Provider component
export function LinkedInEnhancerProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(reducer, initialState);

    const setTone = useCallback((tone: LinkedInUserContext['tone_selection']) => {
        dispatch({ type: 'SET_USER_CONTEXT', payload: { tone_selection: tone } });
    }, []);

    const setTargetIndustry = useCallback((industry: string) => {
        dispatch({ type: 'SET_USER_CONTEXT', payload: { target_industry: industry } });
    }, []);

    const selectCv = useCallback((id: string, type: 'master' | 'standalone') => {
        dispatch({ type: 'SET_SELECTED_CV', payload: { id, type } });
    }, []);

    const triggerEnhancement = useCallback(async (overrideCvId?: string, overrideCvType?: 'master' | 'standalone', regenerate: boolean = false) => {
        // Use override values if provided (for immediate calls after CV selection)
        const cvId = overrideCvId || state.selectedCvId;
        const cvType = overrideCvType || state.selectedCvType;

        if (!cvId) {
            dispatch({ type: 'SET_ERROR', payload: 'No CV selected' });
            return;
        }

        dispatch({ type: 'SET_ENHANCING', payload: true });
        // Only show overlay on regenerate, not on initial load
        dispatch({ type: 'SET_SHOW_ENHANCING_OVERLAY', payload: regenerate });
        dispatch({ type: 'SET_ERROR', payload: null });

        try {
            const response = await fetch('/api/linkedin-enhance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cvId,
                    cvType,
                    tone: state.user_context.tone_selection,
                    targetIndustry: state.user_context.target_industry,
                    regenerate, // Pass regenerate flag
                }),
            });

            if (!response.ok) {
                throw new Error('Enhancement failed');
            }

            const data = await response.json();

            dispatch({
                type: 'SET_ENHANCED_DATA',
                payload: {
                    sections: data.sections || {},
                    side_cards: data.side_cards || {},
                    audit: data.audit,
                    career_guide: data.career_guide,
                },
            });
        } catch (error) {
            dispatch({
                type: 'SET_ERROR',
                payload: error instanceof Error ? error.message : 'Enhancement failed',
            });
            dispatch({ type: 'SET_ENHANCING', payload: false });
            dispatch({ type: 'SET_SHOW_ENHANCING_OVERLAY', payload: false });
        }
    }, [state.selectedCvId, state.selectedCvType, state.user_context]);

    return (
        <LinkedInEnhancerContext.Provider
            value={{
                state,
                dispatch,
                setTone,
                setTargetIndustry,
                selectCv,
                triggerEnhancement,
            }}
        >
            {children}
        </LinkedInEnhancerContext.Provider>
    );
}

// Hook to use context
export function useLinkedInEnhancer() {
    const context = useContext(LinkedInEnhancerContext);
    if (!context) {
        throw new Error('useLinkedInEnhancer must be used within LinkedInEnhancerProvider');
    }
    return context;
}
