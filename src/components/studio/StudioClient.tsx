'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useResumeEnhancer } from '@/contexts/ResumeEnhancerContext';
import { useAICareerReport } from '@/contexts/AICareerReportContext';
import ProfilerHeader from '@/components/resume-enhancer/ProfilerHeader';
import RoleProfilerModal from '@/components/resume-enhancer/RoleProfilerModal';
import FloatingPulsePill from '@/components/resume-enhancer/FloatingPulsePill';
import SurgeonOverlay from '@/components/resume-enhancer/SurgeonOverlay';
import PaneToggleBar from '@/components/resume-enhancer/PaneToggleBar';
import PreviewOverlay from '@/components/resume-enhancer/PreviewOverlay';
import dynamic from 'next/dynamic';
import { Info, Wand2 } from 'lucide-react';

import { HARDCODED_TEMPLATES } from '@/lib/templates/hardcoded-templates';

// ============================================================================
// Props
// ============================================================================

interface StudioClientProps {
    userId: string;
}

// ============================================================================
// Dynamically Import Step Components (reuse from resume-enhancer)
// ============================================================================

const ChoosePathStep = dynamic(() => import('@/components/resume-enhancer/steps/ChoosePathStep'), {
    loading: () => <div className="flex items-center justify-center h-screen bg-[var(--bg-primary)]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[color:var(--accent-primary)]"></div></div>
});

const ChooseTemplateStep = dynamic(() => import('@/components/resume-enhancer/steps/ChooseTemplateStep'), {
    loading: () => <div className="flex items-center justify-center h-screen bg-[var(--bg-primary)]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[color:var(--accent-primary)]"></div></div>
});

const StudioStep3 = dynamic(() => import('@/components/studio/StudioStep3'), {
    loading: () => <div className="flex items-center justify-center h-screen bg-[var(--bg-primary)]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[color:var(--accent-primary)]"></div></div>
});

const Step4Review = dynamic(() => import('@/components/resume-enhancer/steps/Step4Review'), {
    loading: () => <div className="flex items-center justify-center h-screen bg-[var(--bg-primary)]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[color:var(--accent-primary)]"></div></div>
});

// ============================================================================
// Studio Client Component
// ============================================================================

export default function StudioClient({ userId }: StudioClientProps) {
    const { state, dispatch, nextStep, prevStep, goToStep, runCVSurgeon } = useResumeEnhancer();
    const { state: aiReportState } = useAICareerReport();
    const searchParams = useSearchParams();
    const router = useRouter();
    const step = parseInt(searchParams.get('step') || '1');

    // ============================================================================
    // Initialize - Check CV count for Master CV enforcement
    // ============================================================================

    useEffect(() => {
        const checkCVCount = async () => {
            try {
                const response = await fetch('/api/cvs/check-first');
                if (response.ok) {
                    const data = await response.json();
                    const isFirstCV = data.isFirstCV || data.cvCount === 0;

                    console.log('🎨 Studio - CV count check:', {
                        isFirstCV,
                        cvCount: data.cvCount
                    });

                    if (isFirstCV) {
                        dispatch({ type: 'SET_IS_FIRST_CV_CREATION', payload: true });
                        dispatch({ type: 'SET_ENFORCE_MASTER_CV_MODE', payload: true });
                        dispatch({ type: 'SET_CV_TYPE', payload: 'master' });
                        dispatch({ type: 'SET_HAS_MASTER_CV', payload: false });
                        console.log('✅ Studio - First CV detected, enforcing Master CV mode');
                    } else {
                        dispatch({ type: 'SET_IS_FIRST_CV_CREATION', payload: false });
                        dispatch({ type: 'SET_ENFORCE_MASTER_CV_MODE', payload: false });

                        const masterCVResponse = await fetch('/api/cvs/check-master');
                        if (masterCVResponse.ok) {
                            const masterData = await masterCVResponse.json();
                            dispatch({ type: 'SET_HAS_MASTER_CV', payload: masterData.hasMasterCV });
                        }
                    }
                }
            } catch (error) {
                console.error('❌ Studio - Failed to check CV count:', error);
            }
        };

        checkCVCount();
    }, [dispatch]);

    // ============================================================================
    // Sync step from URL
    // ============================================================================

    useEffect(() => {
        if (step && step !== state.currentStep) {
            dispatch({ type: 'SET_CURRENT_STEP', payload: step as 1 | 2 | 3 | 4 });
        }
    }, [step, state.currentStep, dispatch]);

    // ============================================================================
    // Sync CV data from AI Career Report context
    // ============================================================================

    useEffect(() => {
        if (state.currentStep === 1 && aiReportState.cvData && aiReportState.cvData.basics?.name) {
            const hasData = state.cvData.basics?.name;
            if (!hasData || JSON.stringify(aiReportState.cvData) !== JSON.stringify(state.cvData)) {
                console.log('🔄 Studio - Syncing CV data from AI Career Report');
                dispatch({ type: 'SET_CV_DATA', payload: aiReportState.cvData });
            }
        }
    }, [aiReportState.cvData, state.currentStep, state.cvData, dispatch]);

    // ============================================================================
    // Handlers
    // ============================================================================

    const handleProfilerComplete = async (role: string, seniority: any) => {
        dispatch({ type: 'SET_TARGET_ROLE', payload: role });
        dispatch({ type: 'SET_SENIORITY_LEVEL', payload: seniority });
        dispatch({ type: 'SET_SHOW_PROFILER_MODAL', payload: false });

        // Auto-select a default template
        if (!state.selectedTemplate && !aiReportState.selectedTemplate) {
            const defaultTemplate = HARDCODED_TEMPLATES[0];
            dispatch({ type: 'SET_SELECTED_TEMPLATE', payload: defaultTemplate });
        } else if (aiReportState.selectedTemplate && !state.selectedTemplate) {
            dispatch({ type: 'SET_SELECTED_TEMPLATE', payload: aiReportState.selectedTemplate });
        }

        // Run initial CV Surgeon analysis
        await runCVSurgeon();

        // Go to step 3 (CV Builder with Surgeon)
        goToStep(3);
        router.push('/studio?step=3');
    };

    const handleUploadComplete = () => {
        dispatch({ type: 'SET_SHOW_PROFILER_MODAL', payload: true });
    };

    const handleGoToStep = (targetStep: number) => {
        goToStep(targetStep as 1 | 2 | 3 | 4);
        router.push(`/studio?step=${targetStep}`);
    };

    const handleNextStep = () => {
        const nextStepNum = Math.min(state.currentStep + 1, 4);
        handleGoToStep(nextStepNum);
    };

    const handlePrevStep = () => {
        const prevStepNum = Math.max(state.currentStep - 1, 1);
        handleGoToStep(prevStepNum);
    };

    // ============================================================================
    // Render Step
    // ============================================================================

    const renderStep = () => {
        switch (state.currentStep) {
            case 1:
                return (
                    <>
                        {/* Studio Header Banner */}
                        <div className="bg-gradient-to-r from-lime-500/10 dark:from-[#80FF00]/10 to-emerald-500/10 border-b border-lime-500/20 dark:border-[#80FF00]/20 px-6 py-4">
                            <div className="flex items-center justify-center gap-3 max-w-7xl mx-auto">
                                <Wand2 className="w-5 h-5 text-lime-600 dark:text-[#80FF00]" />
                                <div>
                                    <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                                        Welcome to <span className="text-lime-600 dark:text-[#80FF00]">Studio</span>
                                    </h1>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Your advanced CV creation and optimization workspace
                                    </p>
                                </div>
                            </div>
                        </div>

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
                return <ChooseTemplateStep onNext={handleNextStep} onBack={handlePrevStep} />;

            case 3:
                return (
                    <StudioStep3
                        onNext={() => handleGoToStep(4)}
                        onBack={handlePrevStep}
                    />
                );

            case 4:
                return <Step4Review />;

            default:
                return <ChoosePathStep onNext={handleUploadComplete} />;
        }
    };

    // ============================================================================
    // Main Render
    // ============================================================================

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
