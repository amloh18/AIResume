'use client';

import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    Download,
    Eye,
    ZoomIn,
    ZoomOut,
    Image,
    Bot,
    Users,
    FileText,
    Palette,
    Wrench,
    CheckCircle,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';

import type { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { useStudio } from './StudioContext';

// Components
import CVPreviewContent from '@/components/cv-preview/CVPreviewContent';
import JobRoleCard from '@/components/resume-enhancer/JobRoleCard';
import StudioIssuesPanel from './StudioIssuesPanel';
import StudioSurgeonPanel from './StudioSurgeonPanel';
import { StudioStep1, StudioStep2, StudioStep4 } from './steps';
import { CVSurgeonService } from '@/lib/services/cv-surgeon-service';

// ============================================================================
// Props
// ============================================================================

interface StudioLayoutProps {
    cvData: UnifiedCVDataStructure | null;
    userId: string;
    onATSFixClick: () => void;
}

// ============================================================================
// Sidebar Step Navigation
// ============================================================================

interface StepItemProps {
    step: 1 | 2 | 3 | 4;
    label: string;
    icon: React.ReactNode;
    isActive: boolean;
    isCompleted: boolean;
    isDisabled: boolean;
    onClick: () => void;
}

function StepItem({ step, label, icon, isActive, isCompleted, isDisabled, onClick }: StepItemProps) {
    return (
        <button
            onClick={onClick}
            disabled={isDisabled}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${isActive
                    ? 'bg-[#80FF00]/20 text-[#80FF00] border border-[#80FF00]/30'
                    : isCompleted
                        ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                        : isDisabled
                            ? 'text-gray-400 cursor-not-allowed opacity-50'
                            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                }`}
        >
            <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${isActive
                    ? 'bg-[#80FF00] text-black'
                    : isCompleted
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-400'
                }`}>
                {isCompleted ? <CheckCircle className="w-4 h-4" /> : step}
            </div>
            <span className="flex-1 text-left">{label}</span>
            {icon}
        </button>
    );
}

// ============================================================================
// Component
// ============================================================================

export default function StudioLayout({ cvData, userId, onATSFixClick }: StudioLayoutProps) {
    const { state, dispatch, setPreviewView, goToStep, nextStep, prevStep } = useStudio();

    // ============================================================================
    // Handlers
    // ============================================================================

    const handleZoomIn = () => {
        dispatch({ type: 'SET_PREVIEW_ZOOM', payload: Math.min(state.previewZoom + 10, 150) });
    };

    const handleZoomOut = () => {
        dispatch({ type: 'SET_PREVIEW_ZOOM', payload: Math.max(state.previewZoom - 10, 50) });
    };

    const handleExportPDF = async () => {
        console.log('Export PDF clicked');
    };

    const handleExportImage = async () => {
        console.log('Export Image clicked');
    };

    // Fix handlers
    const handleSelectFix = useCallback((fixId: string) => {
        dispatch({ type: 'SET_ACTIVE_FIX', payload: fixId });
    }, [dispatch]);

    const handleApplyFix = useCallback((fix: any) => {
        if (!cvData) return;

        const result = CVSurgeonService.applyFixAnnotation(cvData, fix);
        dispatch({ type: 'SET_CV_DATA', payload: result.updatedCV });
        dispatch({ type: 'MARK_FIX_APPLIED', payload: fix.id });

        const nextFix = state.fixAnnotations.find(
            (f) => f.status === 'open' && f.id !== fix.id
        );
        dispatch({ type: 'SET_ACTIVE_FIX', payload: nextFix?.id || null });
    }, [cvData, dispatch, state.fixAnnotations]);

    const handleDismissFix = useCallback((fixId: string) => {
        dispatch({ type: 'MARK_FIX_DISMISSED', payload: fixId });

        const nextFix = state.fixAnnotations.find(
            (f) => f.status === 'open' && f.id !== fixId
        );
        dispatch({ type: 'SET_ACTIVE_FIX', payload: nextFix?.id || null });
    }, [dispatch, state.fixAnnotations]);

    const handleUpdateField = useCallback((section: string, field: string, value: string, index?: number) => {
        if (!cvData) return;

        const updated = { ...cvData };

        if (section === 'basics') {
            updated.basics = { ...updated.basics, [field]: value };
        } else if (section === 'work' && index !== undefined) {
            updated.work = [...(updated.work || [])];
            updated.work[index] = { ...updated.work[index], [field]: value };
        } else if (section === 'skills' && index !== undefined) {
            updated.skills = [...(updated.skills || [])];
            updated.skills[index] = { ...updated.skills[index], [field]: value };
        }

        dispatch({ type: 'SET_CV_DATA', payload: updated });
    }, [cvData, dispatch]);

    // Step navigation
    const handleStep1Complete = useCallback((parsedCvData: UnifiedCVDataStructure) => {
        dispatch({ type: 'SET_CV_DATA', payload: parsedCvData });
        nextStep();
    }, [dispatch, nextStep]);

    const handleStep2Complete = useCallback(() => {
        nextStep();
    }, [nextStep]);

    // Step completion status
    const isStep1Completed = cvData !== null;
    const isStep2Completed = isStep1Completed; // For now, template is always available
    const isStep3Completed = isStep1Completed && isStep2Completed;

    // Step icons
    const stepIcons = {
        1: <FileText className="w-4 h-4 opacity-60" />,
        2: <Palette className="w-4 h-4 opacity-60" />,
        3: <Wrench className="w-4 h-4 opacity-60" />,
        4: <Download className="w-4 h-4 opacity-60" />,
    };

    // ============================================================================
    // Render Content Based on Step
    // ============================================================================

    const renderStepContent = () => {
        switch (state.currentStep) {
            case 1:
                return (
                    <div className="flex-1 overflow-y-auto">
                        <StudioStep1 onComplete={handleStep1Complete} mode="create" />
                    </div>
                );
            case 2:
                return (
                    <div className="flex-1 overflow-y-auto">
                        <StudioStep2 onComplete={handleStep2Complete} />
                    </div>
                );
            case 3:
                return renderStep3Content();
            case 4:
                return (
                    <div className="flex-1 overflow-y-auto p-4">
                        <StudioStep4 />
                    </div>
                );
            default:
                return null;
        }
    };

    const renderStep3Content = () => (
        <>
            {/* Preview Toolbar */}
            <div className="bg-white dark:bg-[#141810] border-b border-gray-200 dark:border-white/10 px-4 py-2 flex items-center justify-between">
                {/* View Toggle */}
                <div className="flex items-center space-x-1 bg-gray-100 dark:bg-[#1a230f] rounded-lg p-1">
                    <button
                        onClick={() => setPreviewView('normal')}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${state.previewViewType === 'normal'
                            ? 'bg-white dark:bg-[#80FF00] text-gray-900 dark:text-black shadow-sm'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                            }`}
                        title="Normal View"
                    >
                        <Eye className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setPreviewView('recruiter')}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${state.previewViewType === 'recruiter'
                            ? 'bg-white dark:bg-[#80FF00] text-gray-900 dark:text-black shadow-sm'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                            }`}
                        title="Recruiter View"
                    >
                        <Users className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setPreviewView('robot')}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${state.previewViewType === 'robot'
                            ? 'bg-white dark:bg-[#80FF00] text-gray-900 dark:text-black shadow-sm'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                            }`}
                        title="Robot View"
                    >
                        <Bot className="w-4 h-4" />
                    </button>
                </div>

                {/* Zoom Controls */}
                <div className="flex items-center space-x-2">
                    <button
                        onClick={handleZoomOut}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                        title="Zoom Out"
                    >
                        <ZoomOut className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </button>
                    <span className="text-xs text-gray-600 dark:text-gray-400 min-w-[3rem] text-center">
                        {state.previewZoom}%
                    </span>
                    <button
                        onClick={handleZoomIn}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                        title="Zoom In"
                    >
                        <ZoomIn className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </button>
                </div>

                {/* Export Actions */}
                <div className="flex items-center space-x-2">
                    <button
                        onClick={handleExportImage}
                        className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors flex items-center space-x-1"
                    >
                        <Image className="w-4 h-4" />
                        <span>Image</span>
                    </button>
                    <button
                        onClick={handleExportPDF}
                        className="px-3 py-1.5 text-xs font-medium bg-gray-900 dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-100 rounded-lg transition-colors flex items-center space-x-1"
                    >
                        <Download className="w-4 h-4" />
                        <span>PDF</span>
                    </button>
                </div>
            </div>

            {/* Preview Content: Issues Panel + CV Preview */}
            <div className="flex-1 flex min-h-0 overflow-hidden">
                {/* Issues Panel (inside preview area) */}
                <div className="w-[280px] flex-shrink-0">
                    <StudioIssuesPanel
                        fixAnnotations={state.fixAnnotations}
                        activeFixId={state.activeFixId}
                        onSelectFix={handleSelectFix}
                        atsScore={state.atsScore}
                        cvScore={state.cvScore}
                    />
                </div>

                {/* CV Preview */}
                <div className="flex-1 overflow-auto p-4 bg-gray-200 dark:bg-[#0a0d07]">
                    <div
                        className="mx-auto bg-white shadow-xl rounded-lg overflow-hidden"
                        style={{
                            width: `${(21 / 2.54) * 96}px`,
                            transform: `scale(${state.previewZoom / 100})`,
                            transformOrigin: 'top center',
                        }}
                    >
                        {cvData ? (
                            <CVPreviewContent
                                cvData={cvData}
                                theme="light"
                                showBadge={false}
                            />
                        ) : (
                            <div className="h-[842px] flex items-center justify-center text-gray-400">
                                No CV data loaded
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );

    // ============================================================================
    // Render
    // ============================================================================

    return (
        <div className="h-full flex bg-gray-50 dark:bg-[#0a0d07]">
            {/* Left Sidebar: Steps + JobRoleCard */}
            <aside className="w-64 flex-shrink-0 bg-white dark:bg-[#141810] border-r border-gray-200 dark:border-white/10 flex flex-col overflow-hidden">
                {/* Job Role Card */}
                <div className="p-3 border-b border-gray-200 dark:border-white/10">
                    <JobRoleCard
                        targetRole={state.targetRole || state.jobData?.jobTitle || state.jobData?.title || 'Target Role'}
                        seniorityLevel={state.seniorityLevel || 'Professional'}
                        cvType={state.cvType}
                        mode="edit"
                        optimizationScore={state.cvScore}
                    />
                </div>

                {/* Steps Navigation */}
                <div className="flex-1 p-3 space-y-2">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Steps</p>
                    <StepItem
                        step={1}
                        label="Import CV"
                        icon={stepIcons[1]}
                        isActive={state.currentStep === 1}
                        isCompleted={isStep1Completed && state.currentStep > 1}
                        isDisabled={false}
                        onClick={() => goToStep(1)}
                    />
                    <StepItem
                        step={2}
                        label="Choose Template"
                        icon={stepIcons[2]}
                        isActive={state.currentStep === 2}
                        isCompleted={isStep2Completed && state.currentStep > 2}
                        isDisabled={!isStep1Completed}
                        onClick={() => isStep1Completed && goToStep(2)}
                    />
                    <StepItem
                        step={3}
                        label="Edit & Optimize"
                        icon={stepIcons[3]}
                        isActive={state.currentStep === 3}
                        isCompleted={isStep3Completed && state.currentStep > 3}
                        isDisabled={!isStep2Completed}
                        onClick={() => isStep2Completed && goToStep(3)}
                    />
                    <StepItem
                        step={4}
                        label="Export"
                        icon={stepIcons[4]}
                        isActive={state.currentStep === 4}
                        isCompleted={false}
                        isDisabled={!isStep3Completed}
                        onClick={() => isStep3Completed && goToStep(4)}
                    />
                </div>

                {/* CV Type Indicator */}
                <div className="p-3 border-t border-gray-200 dark:border-white/10">
                    <p className="text-xs text-gray-400 mb-2">CV Type</p>
                    <div className="flex gap-2">
                        {(['master', 'journey', 'standalone'] as const).map((type) => (
                            <button
                                key={type}
                                onClick={() => dispatch({ type: 'SET_CV_TYPE', payload: type })}
                                className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-lg transition-colors ${state.cvType === type
                                        ? 'bg-[#80FF00]/20 text-[#80FF00] border border-[#80FF00]/30'
                                        : 'bg-gray-100 dark:bg-white/5 text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10'
                                    }`}
                            >
                                {type === 'master' ? 'Master' : type === 'journey' ? 'Journey' : 'Standalone'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Step Navigation Buttons */}
                <div className="p-3 border-t border-gray-200 dark:border-white/10 flex gap-2">
                    <button
                        onClick={prevStep}
                        disabled={state.currentStep === 1}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-white/10"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Back
                    </button>
                    <button
                        onClick={nextStep}
                        disabled={state.currentStep === 4 || (state.currentStep === 1 && !isStep1Completed)}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-[#80FF00] text-black rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#70e600]"
                    >
                        Next
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </aside>

            {/* Main Content Area - Renders Step Content */}
            <div className="flex-1 flex flex-col min-w-0">
                {renderStepContent()}
            </div>

            {/* Right: CV Surgeon Panel (only visible in Step 3) */}
            {state.currentStep === 3 && (
                <div className="w-[400px] flex-shrink-0">
                    <StudioSurgeonPanel
                        cvData={cvData}
                        fixAnnotations={state.fixAnnotations}
                        activeFixId={state.activeFixId}
                        onSelectFix={handleSelectFix}
                        onApplyFix={handleApplyFix}
                        onDismissFix={handleDismissFix}
                        onUpdateField={handleUpdateField}
                    />
                </div>
            )}
        </div>
    );
}
