'use client';

import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import type {
    LinkedInUserContext,
    LinkedInProfileSections,
    LinkedInSectionStatus,
    LinkedInCvType,
} from '@/types/linkedin';

export interface EnhancerState {
    version: string;
    isLoading: boolean;
    isEnhancing: boolean;
    showEnhancingOverlay: boolean;
    error: string | null;
    user_context: LinkedInUserContext;
    sections: LinkedInProfileSections;
    selectedCvId: string | null;
    selectedCvType: LinkedInCvType | null;
    /** Display name of the source CV (shown in the header instead of a selector). */
    selectedCvName: string | null;
    /** Raw cvData of the loaded source CV — reused on regenerate so no refetch is needed. */
    sourceCvData: any;
}

const initialEnhancerState: EnhancerState = {
    version: '2026.1',
    isLoading: true,
    isEnhancing: false,
    showEnhancingOverlay: false,
    error: null,
    user_context: {
        tone_selection: 'Professional',
        target_industry: '',
        career_goal: '',
    },
    sections: {
        hero: {
            status: 'ORIGINAL',
            current: { headline: '', location: '', name: '', photoUrl: '', bannerUrl: '', connections: '' },
            enhanced: { headline: '', seo_keywords_used: [], location_suggestion: '', rationale: '', confidence_score: 0 },
        },
        about: {
            status: 'ORIGINAL',
            current: '',
            enhanced: { hook: '', body: '', cta: '', character_count: 0, narrative_strategy: '', confidence_score: 0 },
        },
        experience: [],
        education: [],
        projects: [],
        skills_matrix: {
            current: [], suggested_additions: [], verified_badges_eligible: [],
            top_3_priority: [], industry_specific: [], interpersonal: [],
        },
        languages: { languages: [] },
    },
    selectedCvId: null,
    selectedCvType: null,
    selectedCvName: null,
    sourceCvData: null,
};

type Action =
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_ENHANCING'; payload: boolean }
    | { type: 'SET_SHOW_ENHANCING_OVERLAY'; payload: boolean }
    | { type: 'SET_ERROR'; payload: string | null }
    | { type: 'SET_USER_CONTEXT'; payload: Partial<LinkedInUserContext> }
    | { type: 'SET_SECTIONS'; payload: LinkedInProfileSections }
    | { type: 'SET_SELECTED_CV'; payload: { id: string; type: LinkedInCvType; name?: string } }
    | { type: 'SET_ENHANCED_SECTIONS'; payload: Partial<LinkedInProfileSections> }
    | { type: 'UPDATE_SECTION_STATUS'; payload: { section: keyof LinkedInProfileSections; id?: string; status: LinkedInSectionStatus } }
    | { type: 'LOAD_CV_DATA'; payload: { sections: LinkedInProfileSections; cvId: string; cvType: LinkedInCvType; cvName?: string; cvData?: any } }
    | { type: 'RESET_STATE' };

function reducer(state: EnhancerState, action: Action): EnhancerState {
    switch (action.type) {
        case 'SET_LOADING': return { ...state, isLoading: action.payload };
        case 'SET_ENHANCING': return { ...state, isEnhancing: action.payload };
        case 'SET_SHOW_ENHANCING_OVERLAY': return { ...state, showEnhancingOverlay: action.payload };
        case 'SET_ERROR': return { ...state, error: action.payload };
        case 'SET_USER_CONTEXT': return { ...state, user_context: { ...state.user_context, ...action.payload } };
        case 'SET_SECTIONS': return { ...state, sections: action.payload };
        case 'SET_SELECTED_CV': return {
            ...state,
            selectedCvId: action.payload.id,
            selectedCvType: action.payload.type,
            selectedCvName: action.payload.name ?? state.selectedCvName,
        };
        case 'SET_ENHANCED_SECTIONS': {
            const mergedExperience = state.sections.experience.map((exp, idx) => {
                const enhanced = action.payload.experience?.find((e: any) => e.id === exp.id) || action.payload.experience?.[idx];
                if (enhanced?.enhanced_data) {
                    return { ...exp, enhanced_data: enhanced.enhanced_data, status: 'GENERATED' as LinkedInSectionStatus };
                }
                return exp;
            });
            const mergedProjects = state.sections.projects.map((proj, idx) => {
                const enhanced = action.payload.projects?.find((p: any) => p.id === proj.id) || action.payload.projects?.[idx];
                if (enhanced?.enhanced_data) {
                    return { ...proj, enhanced_data: enhanced.enhanced_data, status: 'GENERATED' as LinkedInSectionStatus };
                }
                return proj;
            });

            return {
                ...state,
                sections: {
                    ...state.sections,
                    hero: { ...state.sections.hero, ...action.payload.hero, status: action.payload.hero ? 'GENERATED' : state.sections.hero.status },
                    about: { ...state.sections.about, ...action.payload.about, status: action.payload.about ? 'GENERATED' : state.sections.about.status },
                    experience: mergedExperience,
                    projects: mergedProjects,
                    skills_matrix: { ...state.sections.skills_matrix, ...action.payload.skills_matrix },
                },
                isEnhancing: false,
                showEnhancingOverlay: false,
            };
        }
        case 'UPDATE_SECTION_STATUS': {
            const { section, id, status } = action.payload;
            if (section === 'hero' || section === 'about') {
                return { ...state, sections: { ...state.sections, [section]: { ...state.sections[section], status } } };
            }
            if (section === 'experience' && id) {
                return { ...state, sections: { ...state.sections, experience: state.sections.experience.map(e => e.id === id ? { ...e, status } : e) } };
            }
            if (section === 'projects' && id) {
                return { ...state, sections: { ...state.sections, projects: state.sections.projects.map(p => p.id === id ? { ...p, status } : p) } };
            }
            return state;
        }
        case 'LOAD_CV_DATA':
            return {
                ...state,
                sections: action.payload.sections,
                selectedCvId: action.payload.cvId,
                selectedCvType: action.payload.cvType,
                selectedCvName: action.payload.cvName ?? state.selectedCvName,
                sourceCvData: action.payload.cvData ?? state.sourceCvData,
                isLoading: false,
            };
        case 'RESET_STATE': return initialEnhancerState;
        default: return state;
    }
}

export interface EnhancerContextType {
    state: EnhancerState;
    dispatch: React.Dispatch<Action>;
    setTone: (tone: LinkedInUserContext['tone_selection']) => void;
    setTargetIndustry: (industry: string) => void;
    selectCv: (id: string, type: LinkedInCvType, name?: string) => void;
    updateSectionStatus: (section: keyof LinkedInProfileSections, status: LinkedInSectionStatus, id?: string) => void;
}

const EnhancerContext = createContext<EnhancerContextType | null>(null);

export function EnhancerProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(reducer, initialEnhancerState);

    const setTone = useCallback((tone: LinkedInUserContext['tone_selection']) => {
        dispatch({ type: 'SET_USER_CONTEXT', payload: { tone_selection: tone } });
    }, []);

    const setTargetIndustry = useCallback((industry: string) => {
        dispatch({ type: 'SET_USER_CONTEXT', payload: { target_industry: industry } });
    }, []);

    const selectCv = useCallback((id: string, type: LinkedInCvType, name?: string) => {
        dispatch({ type: 'SET_SELECTED_CV', payload: { id, type, name } });
    }, []);

    const updateSectionStatus = useCallback((section: keyof LinkedInProfileSections, status: LinkedInSectionStatus, id?: string) => {
        dispatch({ type: 'UPDATE_SECTION_STATUS', payload: { section, status, id } });
    }, []);

    return (
        <EnhancerContext.Provider value={{ state, dispatch, setTone, setTargetIndustry, selectCv, updateSectionStatus }}>
            {children}
        </EnhancerContext.Provider>
    );
}

export function useEnhancer() {
    const context = useContext(EnhancerContext);
    if (!context) throw new Error('useEnhancer must be used within EnhancerProvider');
    return context;
}
