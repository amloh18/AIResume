'use client';

import React, { ReactNode, useCallback } from 'react';
import { EnhancerProvider, useEnhancer } from './EnhancerContext';
import { DashboardProvider, useDashboard } from './DashboardContext';
import { ExtensionProvider, useExtension } from './ExtensionContext';
import type { LinkedInCvType } from '@/types/linkedin';

export function LinkedInEnhancerProvider({ children }: { children: ReactNode }) {
    return (
        <EnhancerProvider>
            <DashboardProvider>
                <ExtensionProvider>
                    {children}
                </ExtensionProvider>
            </DashboardProvider>
        </EnhancerProvider>
    );
}

export { useEnhancer, EnhancerProvider } from './EnhancerContext';
export { useDashboard, DashboardProvider } from './DashboardContext';
export { useExtension, ExtensionProvider } from './ExtensionContext';

// Custom hook to replace the old useLinkedInEnhancer and provide triggerEnhancement
export function useLinkedInEnhancer() {
    const enhancer = useEnhancer();
    const dashboard = useDashboard();
    const extension = useExtension();

    const triggerEnhancement = useCallback(async (overrideCvId?: string, overrideCvType?: LinkedInCvType | null, regenerate: boolean = false, cvData?: any) => {
        const cvId = overrideCvId || enhancer.state.selectedCvId;
        const cvType = overrideCvType || enhancer.state.selectedCvType;

        if (!cvId) {
            enhancer.dispatch({ type: 'SET_ERROR', payload: 'No CV selected' });
            return;
        }

        enhancer.dispatch({ type: 'SET_ENHANCING', payload: true });
        enhancer.dispatch({ type: 'SET_SHOW_ENHANCING_OVERLAY', payload: regenerate });
        enhancer.dispatch({ type: 'SET_ERROR', payload: null });

        // Prefer the freshly-loaded raw cvData so the AI is always fed exactly the
        // data shown in the editor. Fall back to the cached source document.
        const sourceCvData = cvData || enhancer.state.sourceCvData;

        try {
            const response = await fetch('/api/linkedin-enhance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cvId,
                    cvType,
                    tone: enhancer.state.user_context.tone_selection,
                    targetIndustry: enhancer.state.user_context.target_industry,
                    regenerate,
                    ...(sourceCvData ? { cvData: sourceCvData } : {}),
                }),
            });

            if (!response.ok) {
                throw new Error('Enhancement failed');
            }

            const data = await response.json();

            // Update Enhancer Context
            enhancer.dispatch({
                type: 'SET_ENHANCED_SECTIONS',
                payload: data.sections || {},
            });

            // Update Dashboard Context
            dashboard.dispatch({
                type: 'SET_DASHBOARD_DATA',
                payload: {
                    side_cards: data.side_cards || dashboard.state.side_cards,
                    audit: data.audit || dashboard.state.audit,
                    career_guide: data.career_guide || dashboard.state.career_guide,
                },
            });
        } catch (error) {
            enhancer.dispatch({
                type: 'SET_ERROR',
                payload: error instanceof Error ? error.message : 'Enhancement failed',
            });
            enhancer.dispatch({ type: 'SET_ENHANCING', payload: false });
            enhancer.dispatch({ type: 'SET_SHOW_ENHANCING_OVERLAY', payload: false });
        }
    }, [enhancer, dashboard]);

    return {
        state: { ...enhancer.state, ...dashboard.state, ...extension.state }, // Combine states for easy reading
        enhancerState: enhancer.state,
        dashboardState: dashboard.state,
        extensionState: extension.state,
        dispatch: enhancer.dispatch, // Deprecated, prefer direct actions
        setTone: enhancer.setTone,
        setTargetIndustry: enhancer.setTargetIndustry,
        selectCv: enhancer.selectCv,
        triggerEnhancement,
        updateSectionStatus: enhancer.updateSectionStatus,
    };
}
