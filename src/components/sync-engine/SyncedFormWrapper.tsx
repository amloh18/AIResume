'use client';

import React, { useEffect, useCallback, useRef } from 'react';
import { useSyncEngine, useSyncEngineSubscription } from '@/lib/hooks/useSyncEngine';
import { UndoRedoControls } from './UndoRedoControls';
import { EnhancedResumeJSON, ChangePayload, ChangeSource } from '@/types/enhanced-resume-schema';
import { SyncEngineConfig } from '@/lib/sync-engine';

interface SyncedFormWrapperProps {
    cvId: string;
    initialData: EnhancedResumeJSON;
    children: (props: {
        data: EnhancedResumeJSON;
        onUpdate: (field: string, value: any) => void;
        onBatchUpdate?: (updates: Array<{ field: string; value: any }>) => void;
    }) => React.ReactNode;
    config?: SyncEngineConfig;
    showUndoRedo?: boolean;
    undoRedoPosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
    onStateChange?: (state: EnhancedResumeJSON) => void;
    className?: string;
}

export const SyncedFormWrapper: React.FC<SyncedFormWrapperProps> = ({
    cvId,
    initialData,
    children,
    config,
    showUndoRedo = true,
    undoRedoPosition = 'top-right',
    onStateChange,
    className = ''
}) => {
    const {
        state,
        canUndo,
        canRedo,
        isSaving,
        handleChange,
        undo,
        redo,
        getHistoryLength
    } = useSyncEngine(initialData, cvId, config);

    // Track if we've notified about the initial state
    const hasNotifiedInitial = useRef(false);

    // Notify parent of state changes
    useEffect(() => {
        if (onStateChange && (hasNotifiedInitial.current || state !== initialData)) {
            onStateChange(state);
            hasNotifiedInitial.current = true;
        }
    }, [state, onStateChange, initialData]);

    // Handle single field update
    const handleUpdate = useCallback((field: string, value: any) => {
        const payload: ChangePayload = {
            type: 'update',
            path: field,
            value,
            previousValue: getNestedValue(state, field),
            metadata: {
                nodeId: cvId,
                sectionId: field.split('.')[0] || 'root'
            },
            timestamp: new Date().toISOString(),
            source: 'form' as ChangeSource
        };
        handleChange('form', payload);
    }, [state, cvId, handleChange]);

    // Handle batch updates (for multi-field changes)
    const handleBatchUpdate = useCallback((updates: Array<{ field: string; value: any }>) => {
        // For batch updates, we'll apply them sequentially
        // The sync engine will handle them as individual changes
        updates.forEach(({ field, value }) => {
            handleUpdate(field, value);
        });
    }, [handleUpdate]);

    // Keyboard shortcuts for undo/redo
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                if (canUndo) undo();
            }
            if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault();
                if (canRedo) redo();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [canUndo, canRedo, undo, redo]);

    // Position classes for undo/redo controls
    const positionClasses = {
        'top-right': 'top-4 right-4',
        'top-left': 'top-4 left-4',
        'bottom-right': 'bottom-4 right-4',
        'bottom-left': 'bottom-4 left-4'
    };

    return (
        <div className={`relative ${className}`}>
            {showUndoRedo && (
                <div className={`absolute z-50 ${positionClasses[undoRedoPosition]}`}>
                    <UndoRedoControls
                        canUndo={canUndo}
                        canRedo={canRedo}
                        onUndo={undo}
                        onRedo={redo}
                        historyLength={getHistoryLength()}
                        isSaving={isSaving}
                    />
                </div>
            )}
            {children({
                data: state,
                onUpdate: handleUpdate,
                onBatchUpdate: handleBatchUpdate
            })}
        </div>
    );
};

// Helper function to get nested values
function getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
        return current?.[key];
    }, obj);
}

export default SyncedFormWrapper;
