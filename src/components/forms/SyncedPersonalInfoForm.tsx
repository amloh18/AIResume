'use client';

import React from 'react';
import { SyncedFormWrapper } from '@/components/sync-engine';
import PersonalInfoForm from './PersonalInfoForm';
import { EnhancedResumeJSON } from '@/types/enhanced-resume-schema';

interface SyncedPersonalInfoFormProps {
    cvId: string;
    initialData: EnhancedResumeJSON;
    jobData?: any;
    userId?: string;
    annotations?: any[];
    onApplyAnnotation?: (fix: any) => void;
    onDismissAnnotation?: (fixId: string) => void;
    reviewMode?: boolean;
    hidePhoto?: boolean;
    hideSummary?: boolean;
    onStateChange?: (state: EnhancedResumeJSON) => void;
}

/**
 * SyncedPersonalInfoForm - Demonstrates integration of sync engine with existing form
 * 
 * This wrapper component:
 * 1. Connects to the sync engine for real-time state management
 * 2. Provides undo/redo functionality
 * 3. Maintains backward compatibility with existing PersonalInfoForm
 * 4. Handles state synchronization across components
 */
const SyncedPersonalInfoForm: React.FC<SyncedPersonalInfoFormProps> = ({
    cvId,
    initialData,
    jobData,
    userId,
    annotations,
    onApplyAnnotation,
    onDismissAnnotation,
    reviewMode,
    hidePhoto,
    hideSummary,
    onStateChange
}) => {
    return (
        <SyncedFormWrapper
            cvId={cvId}
            initialData={initialData}
            onStateChange={onStateChange}
            showUndoRedo={true}
            undoRedoPosition="top-right"
        >
            {({ data, onUpdate }) => (
                <PersonalInfoForm
                    data={data.basics}
                    onUpdate={onUpdate}
                    cvData={data}
                    jobData={jobData}
                    userId={userId}
                    annotations={annotations}
                    onApplyAnnotation={onApplyAnnotation}
                    onDismissAnnotation={onDismissAnnotation}
                    reviewMode={reviewMode}
                    hidePhoto={hidePhoto}
                    hideSummary={hideSummary}
                />
            )}
        </SyncedFormWrapper>
    );
};

export default SyncedPersonalInfoForm;
