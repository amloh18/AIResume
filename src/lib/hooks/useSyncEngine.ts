/**
 * useSyncEngine Hook
 * 
 * React hook for integrating with the SyncEngine
 * Provides real-time state synchronization across components
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { SyncEngine, createSyncEngine, SyncEngineConfig } from '@/lib/sync-engine';
import { EnhancedResumeJSON, ChangePayload, ChangeSource } from '@/types/enhanced-resume-schema';

/**
 * Hook for using sync engine in React components
 */
export function useSyncEngine(
    initialState: EnhancedResumeJSON,
    cvId: string,
    config?: SyncEngineConfig
) {
    const syncEngineRef = useRef<SyncEngine | null>(null);
    const [state, setState] = useState<EnhancedResumeJSON>(initialState);
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [subscriberCount, setSubscriberCount] = useState(0);

    // Initialize sync engine
    useEffect(() => {
        if (!syncEngineRef.current) {
            syncEngineRef.current = createSyncEngine(initialState, cvId, config);
        }

        // Subscribe to state changes
        const subscriberId = `hook-${Date.now()}`;
        syncEngineRef.current.subscribe(subscriberId, (newState, changes, source) => {
            setState(newState);
            setCanUndo(syncEngineRef.current?.canUndo() || false);
            setCanRedo(syncEngineRef.current?.canRedo() || false);
            setIsSaving(syncEngineRef.current?.isSaving() || false);
            setSubscriberCount(syncEngineRef.current?.getSubscriberCount() || 0);
        });

        // Cleanup
        return () => {
            if (syncEngineRef.current) {
                syncEngineRef.current.unsubscribe(subscriberId);
            }
        };
    }, [initialState, cvId, config]);

    /**
     * Handle change from any source
     */
    const handleChange = useCallback((source: ChangeSource, payload: ChangePayload) => {
        if (syncEngineRef.current) {
            syncEngineRef.current.onChange(source, payload);
        }
    }, []);

    /**
     * Undo last change
     */
    const undo = useCallback(() => {
        if (syncEngineRef.current) {
            syncEngineRef.current.undo();
        }
    }, []);

    /**
     * Redo last undone change
     */
    const redo = useCallback(() => {
        if (syncEngineRef.current) {
            syncEngineRef.current.redo();
        }
    }, []);

    /**
     * Force immediate save
     */
    const forceSave = useCallback(async () => {
        if (syncEngineRef.current) {
            await syncEngineRef.current.forceSave();
        }
    }, []);

    /**
     * Get current state
     */
    const getState = useCallback(() => {
        return syncEngineRef.current?.getState() || state;
    }, [state]);

    /**
     * Check if currently saving
     */
    const isCurrentlySaving = useCallback(() => {
        return syncEngineRef.current?.isSaving() || false;
    }, []);

    /**
     * Get history length
     */
    const getHistoryLength = useCallback(() => {
        return syncEngineRef.current?.getHistoryLength() || 0;
    }, []);

    /**
     * Clear history
     */
    const clearHistory = useCallback(() => {
        if (syncEngineRef.current) {
            syncEngineRef.current.clearHistory();
        }
    }, []);

    return {
        state,
        canUndo,
        canRedo,
        isSaving,
        subscriberCount,
        handleChange,
        undo,
        redo,
        forceSave,
        getState,
        isCurrentlySaving,
        getHistoryLength,
        clearHistory
    };
}

/**
 * Hook for subscribing to sync engine changes
 */
export function useSyncEngineSubscription(
    syncEngine: SyncEngine | null,
    subscriberId: string,
    callback: (state: EnhancedResumeJSON, changes: ChangePayload[], source: ChangeSource) => void
) {
    useEffect(() => {
        if (!syncEngine) return;

        syncEngine.subscribe(subscriberId, callback);

        return () => {
            syncEngine.unsubscribe(subscriberId);
        };
    }, [syncEngine, subscriberId, callback]);
}

/**
 * Hook for form integration
 */
export function useFormSync(
    syncEngine: SyncEngine | null,
    sectionId: string,
    itemId?: string
) {
    const [state, setState] = useState<EnhancedResumeJSON | null>(null);

    useEffect(() => {
        if (!syncEngine) return;

        const subscriberId = `form-${sectionId}-${itemId || 'all'}`;
        syncEngine.subscribe(subscriberId, (newState) => {
            setState(newState);
        });

        return () => {
            syncEngine.unsubscribe(subscriberId);
        };
    }, [syncEngine, sectionId, itemId]);

    /**
     * Update a field in the form
     */
    const updateField = useCallback((fieldPath: string, value: any) => {
        if (!syncEngine || !state) return;

        const path = itemId
            ? `sections[${sectionId}].items[${itemId}].${fieldPath}`
            : `sections[${sectionId}].${fieldPath}`;

        syncEngine.onChange('form', {
            type: 'update',
            path,
            value,
            metadata: {
                nodeId: itemId || sectionId,
                sectionId
            },
            timestamp: new Date().toISOString(),
            source: 'form'
        });
    }, [syncEngine, state, sectionId, itemId]);

    /**
     * Add an item to a section
     */
    const addItem = useCallback((item: any) => {
        if (!syncEngine) return;

        syncEngine.onChange('form', {
            type: 'add',
            path: `sections[${sectionId}].items`,
            value: item,
            metadata: {
                nodeId: item.id,
                sectionId
            },
            timestamp: new Date().toISOString(),
            source: 'form'
        });
    }, [syncEngine, sectionId]);

    /**
     * Remove an item from a section
     */
    const removeItem = useCallback((itemId: string) => {
        if (!syncEngine) return;

        syncEngine.onChange('form', {
            type: 'remove',
            path: `sections[${sectionId}].items`,
            metadata: {
                nodeId: itemId,
                sectionId
            },
            timestamp: new Date().toISOString(),
            source: 'form'
        });
    }, [syncEngine, sectionId]);

    return {
        state,
        updateField,
        addItem,
        removeItem
    };
}
