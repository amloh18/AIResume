'use client';

import React from 'react';
import { SyncedFormWrapper } from '@/components/sync-engine';
import WorkExperienceSection from './WorkExperienceSection';
import { EnhancedResumeJSON, ExperienceItem } from '@/types/enhanced-resume-schema';

interface SyncedWorkExperienceFormProps {
    cvId: string;
    initialData: EnhancedResumeJSON;
    jobData?: any;
    userId?: string;
    annotations?: any[];
    onApplyAnnotation?: (fix: any) => void;
    onDismissAnnotation?: (fixId: string) => void;
    reviewMode?: boolean;
    onStateChange?: (state: EnhancedResumeJSON) => void;
}

/**
 * SyncedWorkExperienceForm - Demonstrates sync engine integration with work experience form
 */
const SyncedWorkExperienceForm: React.FC<SyncedWorkExperienceFormProps> = ({
    cvId,
    initialData,
    jobData,
    userId,
    annotations,
    onApplyAnnotation,
    onDismissAnnotation,
    reviewMode,
    onStateChange
}) => {
    // Extract work experience items from sections
    const getWorkExperienceItems = (data: EnhancedResumeJSON): ExperienceItem[] => {
        const experienceSection = data.sections.find(section => section.type === 'experience');
        return (experienceSection?.items || []) as ExperienceItem[];
    };

    return (
        <SyncedFormWrapper
            cvId={cvId}
            initialData={initialData}
            onStateChange={onStateChange}
            showUndoRedo={true}
            undoRedoPosition="top-right"
        >
            {({ data, onUpdate }) => (
                <WorkExperienceSection
                    data={getWorkExperienceItems(data)}
                    onUpdate={(updatedItems: ExperienceItem[]) => {
                        // Update the experience section items
                        const experienceSectionIndex = data.sections.findIndex(
                            section => section.type === 'experience'
                        );
                        if (experienceSectionIndex !== -1) {
                            onUpdate(`sections[${experienceSectionIndex}].items`, updatedItems);
                        }
                    }}
                    cvData={data}
                    jobData={jobData}
                    userId={userId}
                    annotations={annotations}
                    onApplyAnnotation={onApplyAnnotation}
                    onDismissAnnotation={onDismissAnnotation}
                    reviewMode={reviewMode}
                />
            )}
        </SyncedFormWrapper>
    );
};

export default SyncedWorkExperienceForm;
