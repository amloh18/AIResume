'use client';

import React, { useState, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ZoomIn,
    ZoomOut,
    Eye,
    Bot,
    User,
    FileText,
    Wand2,
    X,
    Save,
    Loader2,
} from 'lucide-react';
import CVPreviewContent from '@/components/cv-preview/CVPreviewContent';
import ProfilerHeader from '@/components/resume-enhancer/ProfilerHeader';
import FloatingPulsePill from '@/components/resume-enhancer/FloatingPulsePill';
import StepIndicator from '@/components/resume-enhancer/StepIndicator';
import SidebarMembershipCard from '@/components/resume-enhancer/SidebarMembershipCard';
import SectionEditorModal from '@/components/studio/SectionEditorModal';
import { useResumeEnhancer } from '@/contexts/ResumeEnhancerContext';

// ============================================================================
// Constants
// ============================================================================

const A4_WIDTH = 794;
const A4_HEIGHT = 1123;

type ViewMode = 'normal' | 'recruiter' | 'robot';
type SectionId = 'personal' | 'work' | 'education' | 'skills' | 'projects' | 'certificates' | 'languages' | 'volunteer';

interface StudioStep3Props {
    onNext?: () => void;
    onBack?: () => void;
}

// ============================================================================
// Main Component
// ============================================================================

export default function StudioStep3({ onNext, onBack }: StudioStep3Props) {
    const { state, dispatch, goToStep } = useResumeEnhancer();
    const previewRef = useRef<HTMLDivElement>(null);

    // State
    const [viewMode, setViewMode] = useState<ViewMode>('normal');
    const [zoom, setZoom] = useState(70);
    const [editingSection, setEditingSection] = useState<SectionId | null>(null);
    const [totalPages, setTotalPages] = useState(1);

    // Calculate completed steps (1 and 2 are done if we're on step 3)
    const completedSteps = useMemo(() => [1, 2], []);

    // Zoom handlers
    const handleZoomIn = useCallback(() => setZoom(z => Math.min(z + 10, 150)), []);
    const handleZoomOut = useCallback(() => setZoom(z => Math.max(z - 10, 25)), []);
    const handleZoomReset = useCallback(() => setZoom(70), []);

    // Step navigation
    const handleStepClick = useCallback((step: 1 | 2 | 3 | 4) => {
        goToStep(step);
    }, [goToStep]);

    // Section handlers
    const handleSectionClick = useCallback((sectionId: SectionId) => {
        setEditingSection(sectionId);
    }, []);

    const handleCloseEditor = useCallback(() => {
        setEditingSection(null);
    }, []);

    const handleSectionSave = useCallback((sectionId: SectionId, data: any) => {
        const updatedCvData = { ...state.cvData };
        switch (sectionId) {
            case 'personal': updatedCvData.basics = { ...updatedCvData.basics, ...data }; break;
            case 'work': updatedCvData.work = data; break;
            case 'education': updatedCvData.education = data; break;
            case 'skills': updatedCvData.skills = data; break;
            case 'projects': updatedCvData.projects = data; break;
            case 'certificates': updatedCvData.certificates = data; break;
            case 'languages': updatedCvData.languages = data; break;
            case 'volunteer': updatedCvData.volunteer = data; break;
        }
        dispatch({ type: 'SET_CV_DATA', payload: updatedCvData });
        setEditingSection(null);
    }, [state.cvData, dispatch]);

    // Handle total pages update from CVPreviewContent
    const handleTotalPagesChange = useCallback((pages: number) => {
        setTotalPages(pages);
    }, []);

    // Get section label
    const getSectionLabel = (id: SectionId) => {
        const labels: Record<SectionId, string> = {
            personal: 'Personal Info',
            work: 'Work Experience',
            education: 'Education',
            skills: 'Skills',
            projects: 'Projects',
            certificates: 'Certificates',
            languages: 'Languages',
            volunteer: 'Volunteer',
        };
        return labels[id];
    };

    return (
        <div className="studio-step-3 h-screen flex flex-col bg-[var(--bg-primary)] text-[color:var(--text-primary)]">
            {/* Header */}
            <ProfilerHeader />

            {/* Main Layout: Sidebar | Preview | Surgeon */}
            <div className="flex-1 flex overflow-hidden">

                {/* ==================== LEFT SIDEBAR ==================== */}
                <div className="w-64 flex-shrink-0 bg-[var(--bg-secondary)] border-r border-[var(--border-primary)] flex flex-col overflow-y-auto">
                    {/* Step Indicator */}
                    <div className="p-4 border-b border-[var(--border-primary)]">
                        <StepIndicator
                            currentStep={3}
                            completedSteps={completedSteps}
                            onStepClick={handleStepClick}
                            orientation="vertical"
                        />
                    </div>

                    {/* ATS Score Card (if available) */}
                    {state.atsScore !== undefined && (
                        <div className="p-4 border-b border-[var(--border-primary)]">
                            <div className="bg-[var(--bg-tertiary)] rounded-xl p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        ATS Score
                                    </span>
                                    <Bot className="w-4 h-4 text-gray-400" />
                                </div>
                                <div className="text-3xl font-bold text-lime-600 dark:text-[#80FF00]">
                                    {state.atsScore}%
                                </div>
                                <div className="mt-2 h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-lime-500 dark:bg-[#80FF00] rounded-full transition-all"
                                        style={{ width: `${state.atsScore}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* Membership Card */}
                    <div className="p-4">
                        <SidebarMembershipCard />
                    </div>
                </div>

                {/* ==================== CENTER: PREVIEW ==================== */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Preview Toolbar */}
                    <div className="flex items-center justify-between px-4 py-2 bg-[var(--bg-secondary)] border-b border-[var(--border-primary)]">
                        <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-lime-500 dark:text-[#80FF00]" />
                            <span className="text-sm font-medium">Preview</span>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* View Modes */}
                            <div className="flex items-center bg-gray-100 dark:bg-[#1a230f] rounded-lg p-0.5">
                                {(['normal', 'recruiter', 'robot'] as ViewMode[]).map((mode) => (
                                    <button
                                        key={mode}
                                        onClick={() => setViewMode(mode)}
                                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${viewMode === mode
                                                ? 'bg-white dark:bg-[#80FF00] text-gray-900 dark:text-black shadow-sm'
                                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                                            }`}
                                    >
                                        {mode === 'normal' && <Eye className="w-3 h-3" />}
                                        {mode === 'recruiter' && <User className="w-3 h-3" />}
                                        {mode === 'robot' && <Bot className="w-3 h-3" />}
                                        <span className="capitalize">{mode === 'robot' ? 'ATS' : mode}</span>
                                    </button>
                                ))}
                            </div>

                            {/* Zoom */}
                            <div className="flex items-center gap-1 bg-gray-100 dark:bg-[#1a230f] rounded-lg px-2 py-1">
                                <button onClick={handleZoomOut} className="p-0.5 hover:bg-white/50 dark:hover:bg-white/10 rounded">
                                    <ZoomOut className="w-3.5 h-3.5 text-gray-500" />
                                </button>
                                <button onClick={handleZoomReset} className="px-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                                    {zoom}%
                                </button>
                                <button onClick={handleZoomIn} className="p-0.5 hover:bg-white/50 dark:hover:bg-white/10 rounded">
                                    <ZoomIn className="w-3.5 h-3.5 text-gray-500" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Preview Container - Scrollable with multi-page support */}
                    <div
                        ref={previewRef}
                        className="flex-1 overflow-auto bg-gray-200 dark:bg-[#0a0d07] p-6"
                        style={{ minHeight: 0 }}
                    >
                        <div
                            className="mx-auto"
                            style={{
                                width: A4_WIDTH,
                                transform: `scale(${zoom / 100})`,
                                transformOrigin: 'top center',
                            }}
                        >
                            {/* Multi-page A4 Container */}
                            <div
                                className="bg-white shadow-2xl"
                                style={{
                                    width: A4_WIDTH,
                                    minHeight: A4_HEIGHT,
                                }}
                            >
                                {state.selectedTemplate ? (
                                    <CVPreviewContent
                                        cvData={state.cvData}
                                        templateStyles={(state.selectedTemplate as any)?.styles}
                                        jobData={state.jobData}
                                        onTotalPagesChange={handleTotalPagesChange}
                                    />
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-96 text-gray-400">
                                        <FileText className="w-16 h-16 mb-4 opacity-50" />
                                        <p className="text-lg font-medium">No Template Selected</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ==================== RIGHT: SURGEON PANEL WITH BUILDER ==================== */}
                <FloatingPulsePill />
                {state.showSurgeonOverlay && (
                    <div className="w-[450px] flex-shrink-0 bg-[var(--bg-secondary)] border-l border-[var(--border-primary)] flex flex-col overflow-hidden">
                        {/* Surgeon Header */}
                        <div className="p-4 border-b border-[var(--border-primary)] flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-lime-100 dark:bg-[#80FF00]/20 rounded-lg">
                                    <Wand2 className="w-4 h-4 text-lime-600 dark:text-[#80FF00]" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">AI Surgeon</h3>
                                    <p className="text-xs text-gray-500">Edit with AI suggestions</p>
                                </div>
                            </div>
                            <button
                                onClick={() => dispatch({ type: 'SET_SHOW_SURGEON_OVERLAY', payload: false })}
                                className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg"
                            >
                                <X className="w-4 h-4 text-gray-400" />
                            </button>
                        </div>

                        {/* Builder with Annotations */}
                        <div className="flex-1 overflow-y-auto p-4">
                            <SurgeonFormBuilder
                                cvData={state.cvData}
                                surgicalFixes={state.surgicalFixes || []}
                                onUpdate={(updatedData) => dispatch({ type: 'SET_CV_DATA', payload: updatedData })}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Section Editor Modal */}
            <AnimatePresence>
                {editingSection && (
                    <SectionEditorModal
                        sectionId={editingSection}
                        sectionLabel={getSectionLabel(editingSection)}
                        cvData={state.cvData}
                        onSave={(data) => handleSectionSave(editingSection, data)}
                        onClose={handleCloseEditor}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// ============================================================================
// Surgeon Form Builder with Annotations
// ============================================================================

interface SurgeonFormBuilderProps {
    cvData: any;
    surgicalFixes: any[];
    onUpdate: (data: any) => void;
}

function SurgeonFormBuilder({ cvData, surgicalFixes, onUpdate }: SurgeonFormBuilderProps) {
    const [isSaving, setIsSaving] = useState(false);

    // Get fixes for a specific field
    const getFixesForField = (section: string, field: string) => {
        return surgicalFixes.filter(fix =>
            fix.section?.toLowerCase() === section.toLowerCase() &&
            fix.field?.toLowerCase() === field.toLowerCase()
        );
    };

    // Handle field update
    const handleFieldUpdate = (section: string, field: string, value: string) => {
        const updated = { ...cvData };
        if (section === 'basics') {
            updated.basics = { ...updated.basics, [field]: value };
        }
        onUpdate(updated);
    };

    // Apply a fix
    const applyFix = (fix: any) => {
        if (fix.fixed_text) {
            handleFieldUpdate(fix.section || 'basics', fix.field || 'summary', fix.fixed_text);
        }
    };

    return (
        <div className="space-y-6">
            {/* Personal Summary Section */}
            <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Professional Summary
                </h4>

                <FieldWithAnnotations
                    label="Summary"
                    value={cvData?.basics?.summary || ''}
                    onChange={(v) => handleFieldUpdate('basics', 'summary', v)}
                    fixes={getFixesForField('basics', 'summary')}
                    onApplyFix={applyFix}
                    multiline
                />
            </div>

            {/* Work Experience */}
            {cvData?.work?.length > 0 && (
                <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Work Experience
                    </h4>

                    {cvData.work.map((job: any, index: number) => (
                        <div key={index} className="p-3 bg-[var(--bg-tertiary)] rounded-lg space-y-2">
                            <div className="font-medium text-sm text-gray-900 dark:text-white">
                                {job.position || job.title} at {job.name || job.company}
                            </div>
                            <FieldWithAnnotations
                                label=""
                                value={job.summary || ''}
                                onChange={(v) => {
                                    const updated = { ...cvData };
                                    updated.work[index] = { ...job, summary: v };
                                    onUpdate(updated);
                                }}
                                fixes={surgicalFixes.filter(f => f.section === 'work' && f.itemIndex === index)}
                                onApplyFix={applyFix}
                                multiline
                                placeholder="Add description..."
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* Skills */}
            {cvData?.skills?.length > 0 && (
                <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <Wand2 className="w-4 h-4" />
                        Skills
                    </h4>

                    {cvData.skills.map((skill: any, index: number) => (
                        <div key={index} className="p-3 bg-[var(--bg-tertiary)] rounded-lg">
                            <div className="font-medium text-sm text-gray-900 dark:text-white mb-1">
                                {skill.name || 'Skills'}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                                {skill.keywords?.join(', ') || ''}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ============================================================================
// Field with Annotations Component
// ============================================================================

interface FieldWithAnnotationsProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    fixes: any[];
    onApplyFix: (fix: any) => void;
    multiline?: boolean;
    placeholder?: string;
}

function FieldWithAnnotations({
    label,
    value,
    onChange,
    fixes,
    onApplyFix,
    multiline,
    placeholder
}: FieldWithAnnotationsProps) {
    return (
        <div className="space-y-2">
            {label && (
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</label>
            )}

            {/* Input Field */}
            {multiline ? (
                <textarea
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    rows={4}
                    className="w-full px-3 py-2 bg-white dark:bg-[#0f1410] border border-gray-200 dark:border-white/10 rounded-lg text-sm text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-lime-500/50 dark:focus:ring-[#80FF00]/50 focus:border-lime-500 dark:focus:border-[#80FF00]"
                />
            ) : (
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="w-full px-3 py-2 bg-white dark:bg-[#0f1410] border border-gray-200 dark:border-white/10 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-lime-500/50 dark:focus:ring-[#80FF00]/50 focus:border-lime-500 dark:focus:border-[#80FF00]"
                />
            )}

            {/* Fix Annotations */}
            {fixes.length > 0 && (
                <div className="space-y-2">
                    {fixes.map((fix, index) => (
                        <div key={index} className="p-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg">
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                    <p className="text-xs text-amber-700 dark:text-amber-400 font-medium mb-1">
                                        {fix.issue || 'Suggestion'}
                                    </p>
                                    {fix.fixed_text && (
                                        <p className="text-xs text-gray-600 dark:text-gray-300 bg-white/50 dark:bg-black/20 p-1.5 rounded">
                                            {fix.fixed_text}
                                        </p>
                                    )}
                                </div>
                                <button
                                    onClick={() => onApplyFix(fix)}
                                    className="px-2 py-1 bg-lime-500 dark:bg-[#80FF00] text-black text-xs font-medium rounded hover:bg-lime-600 dark:hover:bg-[#70e600] transition-colors"
                                >
                                    Apply
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
