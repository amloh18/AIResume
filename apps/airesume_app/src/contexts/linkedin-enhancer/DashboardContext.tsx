'use client';

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import type { LinkedInSideCards, LinkedInAudit, LinkedInCareerGuide } from '@/types/linkedin';

export interface DashboardState {
    side_cards: LinkedInSideCards;
    audit: LinkedInAudit | null;
    career_guide: LinkedInCareerGuide | null;
}

const initialDashboardState: DashboardState = {
    side_cards: {
        affiliate_courses: [],
        networking: [],
        career_pathway: { next_step: '', missing_skill: '' },
        profile_strength_score: 0,
        skill_gap_analysis: '',
        recommended_actions: [],
    },
    audit: null,
    career_guide: null,
};

type Action =
    | { type: 'SET_SIDE_CARDS'; payload: LinkedInSideCards }
    | { type: 'SET_AUDIT'; payload: LinkedInAudit }
    | { type: 'SET_CAREER_GUIDE'; payload: LinkedInCareerGuide }
    | { type: 'SET_DASHBOARD_DATA'; payload: Partial<DashboardState> }
    | { type: 'RESET_STATE' };

function reducer(state: DashboardState, action: Action): DashboardState {
    switch (action.type) {
        case 'SET_SIDE_CARDS': return { ...state, side_cards: action.payload };
        case 'SET_AUDIT': return { ...state, audit: action.payload };
        case 'SET_CAREER_GUIDE': return { ...state, career_guide: action.payload };
        case 'SET_DASHBOARD_DATA': return { ...state, ...action.payload };
        case 'RESET_STATE': return initialDashboardState;
        default: return state;
    }
}

export interface DashboardContextType {
    state: DashboardState;
    dispatch: React.Dispatch<Action>;
}

const DashboardContext = createContext<DashboardContextType | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(reducer, initialDashboardState);

    return (
        <DashboardContext.Provider value={{ state, dispatch }}>
            {children}
        </DashboardContext.Provider>
    );
}

export function useDashboard() {
    const context = useContext(DashboardContext);
    if (!context) throw new Error('useDashboard must be used within DashboardProvider');
    return context;
}
