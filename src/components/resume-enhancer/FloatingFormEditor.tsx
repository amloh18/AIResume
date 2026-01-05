'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { X, AlertCircle, Check } from 'lucide-react';
import { useResumeEnhancer } from '@/contexts/ResumeEnhancerContext';
import PersonalInfoForm from '@/components/forms/PersonalInfoForm';
import WorkExperienceSection from '@/components/forms/WorkExperienceSection';
import EducationSection from '@/components/forms/EducationSection';
import SkillsSection from '@/components/forms/SkillsSection';
import ProjectsSection from '@/components/forms/ProjectsSection';
import CertificatesSection from '@/components/forms/CertificatesSection';
import LanguagesSection from '@/components/forms/LanguagesSection';
import VolunteerSection from '@/components/forms/VolunteerSection';
import type { FixAnnotation } from '@/components/resume-enhancer/annotations/fix-annotation';
import { CVSurgeonService } from '@/lib/services/cv-surgeon-service';
import { logResumeEnhancerEvent } from '@/lib/services/resumeEnhancerLogClient';

interface FloatingFormEditorProps {
    sectionId: string;
    onClose: () => void;
    annotations?: FixAnnotation[];
    onApplyAnnotation?: (fix: FixAnnotation) => void;
    onDismissAnnotation?: (fixId: string) => void;
}

const SECTION_TITLES: Record<string, string> = {
    personal: 'Personal Information',
    work: 'Work Experience',
    education: 'Education',
    skills: 'Skills',
    projects: 'Projects',
    certificates: 'Certificates',
    languages: 'Languages',
    volunteer: 'Volunteer Experience',
};

type ExtendedFloatingFormEditorProps = FloatingFormEditorProps & {
    position?: { top: number; left: number; height?: number };
    alignment?: 'left' | 'right';
};

export default function FloatingFormEditor({
    sectionId,
    onClose,
    annotations = [],
    onApplyAnnotation,
    onDismissAnnotation,
    position,
    alignment = 'right'
}: ExtendedFloatingFormEditorProps) {
    const { state, dispatch } = useResumeEnhancer();
    const modalRef = useRef<HTMLDivElement>(null);
    const dragControls = useDragControls();

    // Handle click outside
    const handleBackdropClick = useCallback((e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    }, [onClose]);

    // ESC key handler
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    // Focus trap - Only if not using custom positioning (modal mode)
    useEffect(() => {
        if (position) return; // Disable focus trap for non-modal usage to allow interaction with other elements if needed? Actually better to keep it for a form.

        const modal = modalRef.current;
        if (!modal) return;

        const focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        const handleTab = (e: KeyboardEvent) => {
            if (e.key !== 'Tab') return;

            if (e.shiftKey && document.activeElement === firstElement) {
                e.preventDefault();
                lastElement?.focus();
            } else if (!e.shiftKey && document.activeElement === lastElement) {
                e.preventDefault();
                firstElement?.focus();
            }
        };

        window.addEventListener('keydown', handleTab);
        firstElement?.focus();

        return () => window.removeEventListener('keydown', handleTab);
    }, [position]);

    // CV data update handlers
    const updateCVData = useCallback((data: Partial<typeof state.cvData>) => {
        dispatch({ type: 'SET_CV_DATA', payload: { ...state.cvData, ...data } });
    }, [dispatch, state.cvData]);

    // ... (rest of the form handlers remain the same)

    // Helper to get form component

    // ... (existing switch case implementation)
    // Re-implementing the switch case here as I'm replacing the whole component and can't use "..." for code blocks in this tool
    const getBasics = () => state.cvData?.basics || {};

    const updateBasicsField = (field: string, value: any) => {
        const updatedBasics = {
            ...state.cvData.basics,
            [field]: value,
        };
        updateCVData({ basics: updatedBasics });
    };

    // Add/Remove handlers
    const addEducation = () => {
        const newEducation = { institution: '', area: '', studyType: '', startDate: '', endDate: '', url: '', score: '' };
        updateCVData({ education: [...(state.cvData.education || []), newEducation] });
    };

    const removeEducation = (index: number) => {
        const updated = [...(state.cvData.education || [])];
        updated.splice(index, 1);
        updateCVData({ education: updated });
    };

    const addSkills = () => {
        const newSkill = { category: '', skills: [] };
        updateCVData({ skills: [...(state.cvData.skills || []), newSkill] });
    };

    const removeSkills = (index: number) => {
        const updated = [...(state.cvData.skills || [])];
        updated.splice(index, 1);
        updateCVData({ skills: updated });
    };

    const addProject = () => {
        const newProject = { name: '', description: '', startDate: '', endDate: '', highlights: [], keywords: [], url: '' };
        updateCVData({ projects: [...(state.cvData.projects || []), newProject] });
    };

    const removeProject = (index: number) => {
        const updated = [...(state.cvData.projects || [])];
        updated.splice(index, 1);
        updateCVData({ projects: updated });
    };

    const addCertificate = () => {
        const newCert = { name: '', issuer: '', date: '', url: '', description: '' };
        updateCVData({ certificates: [...(state.cvData.certificates || []), newCert] });
    };

    const removeCertificate = (index: number) => {
        const updated = [...(state.cvData.certificates || [])];
        updated.splice(index, 1);
        updateCVData({ certificates: updated });
    };

    const addLanguage = () => {
        const newLang = { language: '', fluency: '' };
        updateCVData({ languages: [...(state.cvData.languages || []), newLang] });
    };

    const removeLanguage = (index: number) => {
        const updated = [...(state.cvData.languages || [])];
        updated.splice(index, 1);
        updateCVData({ languages: updated });
    };

    // Apply annotation handler
    const handleApplyAnnotation = useCallback((fix: FixAnnotation) => {
        const { updatedCV } = CVSurgeonService.applyFixAnnotation(state.cvData, fix);
        dispatch({ type: 'SET_CV_DATA', payload: updatedCV });
        dispatch({ type: 'MARK_FIX_APPLIED', payload: fix.id });
        logResumeEnhancerEvent({
            action: 'resume_enhancer_fix_applied',
            resourceType: 'cv',
            resourceId: state.cvId,
            metadata: { fixId: fix.id, fieldPath: fix.fieldPath, source: 'floating_form' }
        });
        onApplyAnnotation?.(fix);
    }, [state.cvData, state.cvId, dispatch, onApplyAnnotation]);

    const handleDismissAnnotation = useCallback((fixId: string) => {
        dispatch({ type: 'MARK_FIX_DISMISSED', payload: fixId });
        logResumeEnhancerEvent({
            action: 'resume_enhancer_fix_dismissed',
            resourceType: 'cv',
            resourceId: state.cvId,
            metadata: { fixId, source: 'floating_form' }
        });
        onDismissAnnotation?.(fixId);
    }, [state.cvId, dispatch, onDismissAnnotation]);

    // Filter annotations for current section
    const sectionAnnotations = annotations.filter(f => {
        const prefix = sectionId === 'personal' ? 'basics.' : `${sectionId}[`;
        return f.fieldPath.startsWith(prefix) && f.status === 'open';
    });

    // Render form based on section
    const renderSectionForm = () => {
        switch (sectionId) {
            case 'personal':
            case 'summary': // Summary is part of basics/personal info
                return (
                    <PersonalInfoForm
                        data={getBasics()}
                        cvData={state.cvData}
                        jobData={state.jobData}
                        onUpdate={updateBasicsField}
                        annotations={annotations}
                        onApplyAnnotation={handleApplyAnnotation}
                        onDismissAnnotation={handleDismissAnnotation}
                        reviewMode={state.reviewMode}
                    />
                );
            case 'work':
                return (
                    <WorkExperienceSection
                        data={state.cvData.work || []}
                        onUpdate={(updated) => updateCVData({ work: updated })}
                        annotations={annotations}
                        onApplyAnnotation={handleApplyAnnotation}
                        onDismissAnnotation={handleDismissAnnotation}
                        reviewMode={state.reviewMode}
                    />
                );
            case 'education':
                return (
                    <EducationSection
                        data={state.cvData.education || []}
                        onUpdate={(updated) => updateCVData({ education: updated })}
                        onAdd={addEducation}
                        onRemove={removeEducation}
                        jobData={state.jobData}
                    />
                );
            case 'skills':
                return (
                    <SkillsSection
                        data={state.cvData.skills || []}
                        onUpdate={(updated) => updateCVData({ skills: updated })}
                        onAdd={addSkills}
                        onRemove={removeSkills}
                    />
                );
            case 'projects':
                return (
                    <ProjectsSection
                        data={state.cvData.projects || []}
                        onUpdate={(updated) => updateCVData({ projects: updated })}
                        onAdd={addProject}
                        onRemove={removeProject}
                        jobData={state.jobData}
                    />
                );
            case 'certificates':
                return (
                    <CertificatesSection
                        data={state.cvData.certificates || []}
                        onUpdate={(updated) => updateCVData({ certificates: updated })}
                        onAdd={addCertificate}
                        onRemove={removeCertificate}
                        jobData={state.jobData}
                    />
                );
            case 'languages':
                return (
                    <LanguagesSection
                        data={state.cvData.languages || []}
                        onUpdate={(updated) => updateCVData({ languages: updated })}
                        onAdd={addLanguage}
                        onRemove={removeLanguage}
                    />
                );
            case 'volunteer':
                return (
                    <VolunteerSection
                        data={state.cvData.volunteer || []}
                        onUpdate={(updated) => updateCVData({ volunteer: updated })}
                    />
                );
            default:
                return (
                    <div className="text-center py-8 text-white/60">
                        <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>Unknown section: {sectionId}</p>
                    </div>
                );
        }
    };

    // Calculate style for positioning
    const containerStyle = position ? {
        position: 'fixed' as const,
        top: position.top,
        left: position.left,
        margin: 0,
        // Height logic: Don't constrain to section height. Use auto with max/min limits.
        height: 'auto',
        maxHeight: `calc(100vh - ${position.top}px - 24px)`, // Prevent bottom clipping
        minHeight: '300px' // Ensure it's not too small
        // transform: 'none' // Override framer-motion centering
    } : undefined;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={position ? "fixed inset-0 z-50 pointer-events-none" : "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"}
                onClick={handleBackdropClick}
            >
                <div
                    className={position ? "absolute inset-0 pointer-events-auto" : "hidden"}
                    onClick={handleBackdropClick} // Transparent backdrop for positioned mode to catch clicks
                />
                <motion.div
                    ref={modalRef}
                    // Drag props
                    drag={!!position}
                    dragListener={false}
                    dragMomentum={false}
                    dragControls={dragControls}
                    // Animation
                    initial={position ? { opacity: 0, scale: 0.95, x: alignment === 'left' ? 20 : -20 } : { opacity: 0, scale: 0.95, y: 20 }}
                    animate={position ? { opacity: 1, scale: 1, x: 0 } : { opacity: 1, scale: 1, y: 0 }}
                    exit={position ? { opacity: 0, scale: 0.95 } : { opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ duration: 0.2 }}
                    style={containerStyle}
                    className={`
                        w-full max-w-2xl bg-[#1a1a1a]/95 backdrop-blur-3xl rounded-3xl border border-white/10 shadow-2xl flex flex-col pointer-events-auto overflow-hidden
                        ${!position ? 'max-h-[90vh]' : ''}
                    `}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div
                        className={`flex items-center justify-between px-5 py-4 border-b border-white/10 ${position ? 'cursor-move' : ''}`}
                        onPointerDown={(e) => {
                            if (position) dragControls.start(e);
                        }}
                    >
                        <div className="flex items-center gap-3">
                            <h2 className="text-lg font-semibold text-white">
                                {SECTION_TITLES[sectionId] || 'Edit Section'}
                            </h2>
                            {sectionAnnotations.length > 0 && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-amber-500/20 text-amber-300 rounded-full">
                                    {sectionAnnotations.length} suggestion{sectionAnnotations.length !== 1 ? 's' : ''}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={onClose}
                                onPointerDown={(e) => e.stopPropagation()}
                                className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                                aria-label="Cancel"
                                title="Cancel"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <button
                                onClick={onClose}
                                onPointerDown={(e) => e.stopPropagation()}
                                className="p-2 rounded-lg bg-[#80FF00]/10 text-[#80FF00] hover:bg-[#80FF00]/20 transition-colors"
                                aria-label="Accept"
                                title="Accept"
                            >
                                <Check className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Form Content */}
                    <div className="flex-1 overflow-y-auto overscroll-contain p-5">
                        {renderSectionForm()}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
