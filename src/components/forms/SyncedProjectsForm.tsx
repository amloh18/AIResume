'use client';

import React from 'react';
import { SyncedFormWrapper } from '@/components/sync-engine';
import ProjectsSection from './ProjectsSection';
import { EnhancedResumeJSON, ProjectItem } from '@/types/enhanced-resume-schema';

interface SyncedProjectsFormProps {
    cvId: string;
    initialData: EnhancedResumeJSON;
    onStateChange?: (state: EnhancedResumeJSON) => void;
}

/**
 * SyncedProjectsForm - Demonstrates sync engine integration with projects form
 */
const SyncedProjectsForm: React.FC<SyncedProjectsFormProps> = ({
    cvId,
    initialData,
    onStateChange
}) => {
    // Extract projects items from sections
    const getProjectsItems = (data: EnhancedResumeJSON): ProjectItem[] => {
        const projectsSection = data.sections.find(section => section.type === 'projects');
        return (projectsSection?.items || []) as ProjectItem[];
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
                const projectsItems = getProjectsItems(data);
                const projectsSectionIndex = data.sections.findIndex(
                    section => section.type === 'projects'
                );

                const handleUpdate = (updatedItems: ProjectItem[]) => {
                    if (projectsSectionIndex !== -1) {
                        onUpdate(`sections[${projectsSectionIndex}].items`, updatedItems);
                    }
                };

                const handleAdd = () => {
                    const newProject: ProjectItem = {
                        id: crypto.randomUUID(),
                        name: '',
                        description: '',
                        highlights: [],
                        keywords: [],
                        startDate: '',
                        endDate: '',
                        url: ''
                    };
                    handleUpdate([...projectsItems, newProject]);
                };

                const handleRemove = (index: number) => {
                    const updatedItems = projectsItems.filter((_, i) => i !== index);
                    handleUpdate(updatedItems);
                };

                return (
                    <ProjectsSection
                        data={projectsItems}
                        onUpdate={handleUpdate}
                        onAdd={handleAdd}
                        onRemove={handleRemove}
                    />
                );
            }}
        </SyncedFormWrapper>
    );
};

export default SyncedProjectsForm;
