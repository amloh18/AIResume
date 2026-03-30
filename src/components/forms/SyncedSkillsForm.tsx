'use client';

import React from 'react';
import { SyncedFormWrapper } from '@/components/sync-engine';
import SkillsSection from './SkillsSection';
import { EnhancedResumeJSON, SkillsItem } from '@/types/enhanced-resume-schema';

interface SyncedSkillsFormProps {
    cvId: string;
    initialData: EnhancedResumeJSON;
    onStateChange?: (state: EnhancedResumeJSON) => void;
}

/**
 * SyncedSkillsForm - Demonstrates sync engine integration with skills form
 */
const SyncedSkillsForm: React.FC<SyncedSkillsFormProps> = ({
    cvId,
    initialData,
    onStateChange
}) => {
    // Extract skills items from sections
    const getSkillsItems = (data: EnhancedResumeJSON): SkillsItem[] => {
        const skillsSection = data.sections.find(section => section.type === 'skills');
        return (skillsSection?.items || []) as SkillsItem[];
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
                const skillsItems = getSkillsItems(data);
                const skillsSectionIndex = data.sections.findIndex(
                    section => section.type === 'skills'
                );

                const handleUpdate = (updatedItems: SkillsItem[]) => {
                    if (skillsSectionIndex !== -1) {
                        onUpdate(`sections[${skillsSectionIndex}].items`, updatedItems);
                    }
                };

                const handleAdd = () => {
                    const newSkill: SkillsItem = {
                        id: crypto.randomUUID(),
                        category: '',
                        skills: []
                    };
                    handleUpdate([...skillsItems, newSkill]);
                };

                const handleRemove = (index: number) => {
                    const updatedItems = skillsItems.filter((_, i) => i !== index);
                    handleUpdate(updatedItems);
                };

                return (
                    <SkillsSection
                        data={skillsItems}
                        onUpdate={handleUpdate}
                        onAdd={handleAdd}
                        onRemove={handleRemove}
                    />
                );
            }}
        </SyncedFormWrapper>
    );
};

export default SyncedSkillsForm;
