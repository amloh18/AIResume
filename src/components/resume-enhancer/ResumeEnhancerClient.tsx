'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ResumeEnhancerProvider, useResumeEnhancer } from '@/contexts/ResumeEnhancerContext';
import { useAICareerReport } from '@/contexts/AICareerReportContext';
import ProfilerHeader from '@/components/resume-enhancer/ProfilerHeader';
import RoleProfilerModal from '@/components/resume-enhancer/RoleProfilerModal';
import FloatingPulsePill from '@/components/resume-enhancer/FloatingPulsePill';
import SurgeonOverlay from '@/components/resume-enhancer/SurgeonOverlay';
import PaneToggleBar from '@/components/resume-enhancer/PaneToggleBar';
import PreviewOverlay from '@/components/resume-enhancer/PreviewOverlay';
import dynamic from 'next/dynamic';

import { HARDCODED_TEMPLATES } from '@/lib/templates/hardcoded-templates';

// Dynamically import step components
const ChoosePathStep = dynamic(() => import('@/components/ai-career-report/ChoosePathStep'), {
    loading: () => <div className="flex items-center justify-center h-screen bg-[var(--bg-primary)]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[color:var(--accent-primary)]"></div></div>
});

const ChooseTemplateStep = dynamic(() => import('@/components/ai-career-report/ChooseTemplateStep'), {
    loading: () => <div className="flex items-center justify-center h-screen bg-[var(--bg-primary)]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[color:var(--accent-primary)]"></div></div>
});

const MasterCVBuilderStep = dynamic(() => import('@/components/ai-career-report/MasterCVBuilderStep'), {
    loading: () => <div className="flex items-center justify-center h-screen bg-[var(--bg-primary)]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[color:var(--accent-primary)]"></div></div>
});

function ResumeEnhancerContent() {
    const { state, dispatch, nextStep, prevStep, goToStep, runCVSurgeon } = useResumeEnhancer();
    const { state: aiReportState } = useAICareerReport();
    const searchParams = useSearchParams();
    const step = parseInt(searchParams.get('step') || '1');

    React.useEffect(() => {
        if (step && step !== state.currentStep) {
            dispatch({ type: 'SET_CURRENT_STEP', payload: step as 1 | 2 | 3 });
        }
    }, [step]);

    // Sync CV data from AI Career Report context (where ChoosePathStep saves it)
    React.useEffect(() => {
        if (state.currentStep === 1 && aiReportState.cvData && aiReportState.cvData.basics?.name) {
            // Check if we need to sync (avoid infinite loops/unnecessary updates)
            const hasData = state.cvData.basics?.name;
            if (!hasData || JSON.stringify(aiReportState.cvData) !== JSON.stringify(state.cvData)) {
                console.log('🔄 Syncing CV data from AI Career Report to Resume Enhancer');
                dispatch({ type: 'SET_CV_DATA', payload: aiReportState.cvData });
            }
        }
    }, [aiReportState.cvData, state.currentStep, state.cvData]);

    const handleProfilerComplete = async (role: string, seniority: any) => {
        dispatch({ type: 'SET_TARGET_ROLE', payload: role });
        dispatch({ type: 'SET_SENIORITY_LEVEL', payload: seniority });
        dispatch({ type: 'SET_SHOW_PROFILER_MODAL', payload: false });

        // Auto-select a default template (skip template selection for now)
        if (!state.selectedTemplate && !aiReportState.selectedTemplate) {
            // Use first template from hardcoded templates as default
            const defaultTemplate = HARDCODED_TEMPLATES[0];
            dispatch({ type: 'SET_SELECTED_TEMPLATE', payload: defaultTemplate });
        } else if (aiReportState.selectedTemplate && !state.selectedTemplate) {
            dispatch({ type: 'SET_SELECTED_TEMPLATE', payload: aiReportState.selectedTemplate });
        }

        // Run initial CV Surgeon analysis
        await runCVSurgeon();

        // Skip directly to step 3 (CV Builder with Surgeon features)
        goToStep(3);
    };

    const handleUploadComplete = () => {
        // Show profiler modal after upload
        dispatch({ type: 'SET_SHOW_PROFILER_MODAL', payload: true });
    };

    const renderStep = () => {
        switch (state.currentStep) {
            case 1:
                return <ChoosePathStep onNext={handleUploadComplete} />;
            case 2:
                return <ChooseTemplateStep onNext={nextStep} onBack={prevStep} />;
            case 3:
                return (
                    <div className="dashboard-page resume-enhancer-page h-screen flex flex-col bg-[var(--bg-primary)] text-[color:var(--text-primary)]">
                        <ProfilerHeader />
                        <div className="flex-1 flex overflow-hidden relative">
                            {/* Main Form Area - Takes remaining space; shrinks when surgeon opens */}
                            <div className="flex-1 min-w-0 overflow-y-auto">
                                <MasterCVBuilderStep onNext={() => { }} onBack={prevStep} isEmbedded={state.showSurgeonOverlay} />
                            </div>
                            <FloatingPulsePill />
                            {/* Right Pane - Wider CV Surgeon panel with more space */}
                            {state.showSurgeonOverlay && (
                                <div className="w-[55vw] flex-none min-w-[550px] max-w-[900px] relative flex flex-col bg-[var(--bg-secondary)] overflow-hidden shadow-2xl shadow-black/20 dark:shadow-black/50">
                                    <PaneToggleBar />
                                    {state.showPreviewOverlay ? (
                                        <PreviewOverlay />
                                    ) : (
                                        <SurgeonOverlay />
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                );
            default:
                return <ChoosePathStep onNext={handleUploadComplete} />;
        }
    };

    return (
        <>
            {renderStep()}

            {/* Role Profiler Modal */}
            <RoleProfilerModal
                isOpen={state.showProfilerModal}
                onClose={() => dispatch({ type: 'SET_SHOW_PROFILER_MODAL', payload: false })}
                onComplete={handleProfilerComplete}
            />
        </>
    );
}

export default function ResumeEnhancerClient() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-screen bg-[var(--bg-primary)]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[color:var(--accent-primary)]"></div>
            </div>
        }>
            <ResumeEnhancerProvider>
                <ResumeEnhancerContent />
            </ResumeEnhancerProvider>
        </Suspense>
    );
}
