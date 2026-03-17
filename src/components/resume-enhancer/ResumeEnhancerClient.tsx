'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ResumeEnhancerProvider, useResumeEnhancer } from '@/contexts/ResumeEnhancerContext';
import { useAICareerReport } from '@/contexts/AICareerReportContext';
import ProfilerHeader from '@/components/resume-enhancer/ProfilerHeader';
import RoleProfilerModal from '@/components/resume-enhancer/RoleProfilerModal';
import FloatingPulsePill from '@/components/resume-enhancer/FloatingPulsePill';
import SurgeonOverlay from '@/components/resume-enhancer/SurgeonOverlay';
import PaneToggleBar from '@/components/resume-enhancer/PaneToggleBar';
import PreviewOverlay from '@/components/resume-enhancer/PreviewOverlay';
import dynamic from 'next/dynamic';
import { Info } from 'lucide-react';

import { HARDCODED_TEMPLATES } from '@/lib/templates/hardcoded-templates';

// Dynamically import step components
const ChoosePathStep = dynamic(() => import('@/components/resume-enhancer/steps/ChoosePathStep'), {
    loading: () => <div className="flex items-center justify-center h-screen bg-[var(--bg-primary)]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[color:var(--accent-primary)]"></div></div>
});

const ChooseTemplateStep = dynamic(() => import('@/components/resume-enhancer/steps/ChooseTemplateStep'), {
    loading: () => <div className="flex items-center justify-center h-screen bg-[var(--bg-primary)]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[color:var(--accent-primary)]"></div></div>
});

const MasterCVBuilderStep = dynamic(() => import('@/components/resume-enhancer/steps/MasterCVBuilderStep'), {
    loading: () => <div className="flex items-center justify-center h-screen bg-[var(--bg-primary)]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[color:var(--accent-primary)]"></div></div>
});

function ResumeEnhancerContent() {
    const { state, dispatch, nextStep, prevStep, goToStep, runCVSurgeon } = useResumeEnhancer();
    const { state: aiReportState } = useAICareerReport();
    const searchParams = useSearchParams();
    const router = useRouter();
    // Validate step parameter - must be 1-4
    const stepParam = searchParams.get('step');
    const parsedStep = stepParam ? parseInt(stepParam, 10) : 1;
    const step = isNaN(parsedStep) ? 1 : Math.max(1, Math.min(4, parsedStep));

    // Check if user has any CVs and if this is their first CV creation
    useEffect(() => {
        const checkCVCount = async () => {
            try {
                const response = await fetch('/api/cvs/check-first');
                if (response.ok) {
                    const data = await response.json();
                    const isFirstCV = data.isFirstCV || data.cvCount === 0;

                    if (isFirstCV) {
                        // This is the first CV - enforce Master CV mode
                        dispatch({ type: 'SET_IS_FIRST_CV_CREATION', payload: true });
                        dispatch({ type: 'SET_ENFORCE_MASTER_CV_MODE', payload: true });
                        dispatch({ type: 'SET_CV_TYPE', payload: 'master' });
                        dispatch({ type: 'SET_HAS_MASTER_CV', payload: false });
                    } else {
                        dispatch({ type: 'SET_IS_FIRST_CV_CREATION', payload: false });
                        dispatch({ type: 'SET_ENFORCE_MASTER_CV_MODE', payload: false });

                        // Check if user has a Master CV
                        const masterCVResponse = await fetch('/api/cvs/check-master');
                        if (masterCVResponse.ok) {
                            const masterData = await masterCVResponse.json();
                            dispatch({ type: 'SET_HAS_MASTER_CV', payload: masterData.hasMasterCV });
                        }
                    }
                }
            } catch (error) {
                console.error('❌ Resume Enhancer - Failed to check CV count:', error);
            }
        };

        checkCVCount();
    }, []); // Run once on mount

    useEffect(() => {
        if (step && step !== state.currentStep) {
            dispatch({ type: 'SET_CURRENT_STEP', payload: step as 1 | 2 | 3 });
        }
    }, [step, state.currentStep, dispatch]);

    // Sync CV data from AI Career Report context (where ChoosePathStep saves it)
    useEffect(() => {
        if (state.currentStep === 1 && aiReportState.cvData && aiReportState.cvData.basics?.name) {
            // Check if we need to sync (avoid infinite loops/unnecessary updates)
            const hasData = state.cvData.basics?.name;
            if (!hasData || JSON.stringify(aiReportState.cvData) !== JSON.stringify(state.cvData)) {
                dispatch({ type: 'SET_CV_DATA', payload: aiReportState.cvData });
            }
        }
    }, [aiReportState.cvData, state.currentStep, state.cvData, dispatch]);

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
                return (
                    <>
                        {state.enforceMasterCVMode && (
                            <div className="bg-gradient-to-r from-[var(--accent-primary)]/10 to-[var(--accent-secondary)]/10 border border-[var(--accent-primary)]/30 rounded-lg p-4 mx-auto max-w-3xl mb-6 mt-6">
                                <div className="flex items-start gap-3">
                                    <Info className="w-5 h-5 text-[var(--accent-primary)] flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h3 className="font-semibold text-[var(--text-primary)] mb-1">
                                            Creating Your Master CV
                                        </h3>
                                        <p className="text-sm text-[var(--text-secondary)]">
                                            This will be your Master CV — a comprehensive resume that captures your full experience.
                                            You'll be able to create tailored versions for specific jobs later.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                        <ChoosePathStep onNext={handleUploadComplete} />
                    </>
                );
            case 2:
                return <ChooseTemplateStep onNext={nextStep} onBack={prevStep} />;
            case 3:
                return (
                    <div className="dashboard-page resume-enhancer-page h-screen flex flex-col bg-[var(--bg-primary)] text-[color:var(--text-primary)]">
                        <ProfilerHeader />
                        {state.enforceMasterCVMode && (
                            <div className="bg-gradient-to-r from-[var(--accent-primary)]/10 to-[var(--accent-secondary)]/10 border-t border-b border-[var(--accent-primary)]/20 px-6 py-3">
                                <div className="flex items-center justify-center gap-2 max-w-7xl mx-auto">
                                    <Info className="w-4 h-4 text-[var(--accent-primary)]" />
                                    <p className="text-sm font-medium text-[var(--text-primary)]">
                                        Creating your Master CV — this will be the foundation for all your job applications
                                    </p>
                                </div>
                            </div>
                        )}
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

export default function ResumeEnhancerClientWrapper() {
    return (
        <ResumeEnhancerProvider>
            <React.Suspense fallback={
                <div className="flex items-center justify-center h-screen bg-[var(--bg-primary)]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[color:var(--accent-primary)]"></div>
                </div>
            }>
                <ResumeEnhancerContent />
            </React.Suspense>
        </ResumeEnhancerProvider>
    );
}
