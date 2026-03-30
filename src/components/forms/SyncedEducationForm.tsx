'use client';

import React from 'react';
import { SyncedFormWrapper } from '@/components/sync-engine';
import EducationSection from './EducationSection';
import { EnhancedResumeJSON, EducationItem } from '@/types/enhanced-resume-schema';

interface SyncedEducationFormProps {
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
 * SyncedEducationForm - Demonstrates sync engine integration with education form
 */
const SyncedEducationForm: React.FC<SyncedEducationFormProps> = ({
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
    // Extract education items from sections
    const getEducationItems = (data: EnhancedResumeJSON): EducationItem[] => {
        const educationSection = data.sections.find(section => section.type === 'education');
        return (educationSection?.items || []) as EducationItem[];
    };

    return (
        <SyncedFormWrapper
            cvId={cvId}
            initialData={initialData}
            onStateChange={onStateChange}
            showUndoRedo={true}
            undoRedoPosition="top-right"
        >
            {({ data, onUpdate }) => {
                const educationItems = getEducationItems(data);
                const educationSectionIndex = data.sections.findIndex(
                    section => section.type === 'education'
                );

                const handleUpdate = (updatedItems: EducationItem[]) => {
                    if (educationSectionIndex !== -1) {
                        onUpdate(`sections[${educationSectionIndex}].items`, updatedItems);
                    }
                };

                const handleAdd = () => {
                    const newEducation: EducationItem = {
                        id: crypto.randomUUID(),
                        institution: '',
                        url: '',
                        area: '',
                        studyType: '',
                        startDate: '',
                        endDate: '',
                        score: '',
                        courses: []
                    };
                    handleUpdate([...educationItems, newEducation]);
                };

                const handleRemove = (index: number) => {
                    const updatedItems = educationItems.filter((_, i) => i !== index);
                    handleUpdate(updatedItems);
                };

                return (
                    <EducationSection
                        data={educationItems}
                        onUpdate={handleUpdate}
                        onAdd={handleAdd}
                        onRemove={handleRemove}
                        jobData={jobData}
                        userId={userId}
                    />
                );
            }}
        </SyncedFormWrapper>
    );
};

export default SyncedEducationForm;
