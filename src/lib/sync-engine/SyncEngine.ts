/**
 * Sync Engine - Core Synchronization System
 * 
 * This is the critical infrastructure that enables real-time synchronization
 * between the form layer, editor layer, and preview layer.
 * 
 * Design Principles:
 * 1. Single Source of Truth - JSON state owns everything
 * 2. Pub/Sub Pattern - Decoupled components
 * 3. Optimistic Updates - Immediate UI feedback
 * 4. Debounced Persistence - Efficient database writes
 * 5. Conflict Resolution - Handle concurrent edits
 * 6. Undo/Redo - Full change history
 */

import { EnhancedResumeJSON, ChangePayload, ChangeSource } from '@/types/enhanced-resume-schema';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Subscriber callback function
 */
export type SubscriberCallback = (
    state: EnhancedResumeJSON,
    changes: ChangePayload[],
    source: ChangeSource
) => void;

/**
 * Subscriber information
 */
interface Subscriber {
    id: string;
    callback: SubscriberCallback;
    lastNotified: string;
}

/**
 * History entry for undo/redo
 */
interface HistoryEntry {
    state: EnhancedResumeJSON;
    timestamp: string;
    source: ChangeSource;
}

/**
 * Sync engine configuration
 */
export interface SyncEngineConfig {
    debounceMs?: number;
    maxHistorySize?: number;
    enableUndoRedo?: boolean;
    conflictStrategy?: 'last-write-wins' | 'merge' | 'manual';
}

// ============================================================================
// STATE MANAGER
// ============================================================================

class StateManager {
    private state: EnhancedResumeJSON;
    private history: HistoryEntry[] = [];
    private historyIndex: number = -1;
    private maxHistorySize: number = 50;

    private initialState: EnhancedResumeJSON;

    constructor(initialState: EnhancedResumeJSON, maxHistorySize: number = 50) {
        this.state = initialState;
        this.initialState = JSON.parse(JSON.stringify(initialState));
        this.maxHistorySize = maxHistorySize;

        // Save initial state to history to enable redo back to initial state
        this.history.push({
            state: JSON.parse(JSON.stringify(initialState)),
            timestamp: new Date().toISOString(),
            source: 'sync'
        });
        this.historyIndex = 0;
    }

    /**
     * Get current state
     */
    getState(): EnhancedResumeJSON {
        return this.state;
    }

    /**
     * Update state
     */
    setState(newState: EnhancedResumeJSON, source: ChangeSource): void {
        // Update state
        this.state = newState;

        // Increment version
        this.state.meta.version++;
        this.state.meta.lastModified = new Date().toISOString();

        // Save to history after updating (save the new state)
        this.saveToHistory(this.state, source);
    }

    /**
     * Save to history for undo/redo
     */
    private saveToHistory(state: EnhancedResumeJSON, source: ChangeSource): void {
        // Remove any future history if we're not at the end
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }

        // Add new entry
        this.history.push({
            state: JSON.parse(JSON.stringify(state)), // Deep clone
            timestamp: new Date().toISOString(),
            source
        });

        // Limit history size
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        } else {
            this.historyIndex++;
        }
    }

    /**
     * Undo last change
     */
    undo(): EnhancedResumeJSON | null {
        if (this.historyIndex >= 0) {
            this.historyIndex--;
            if (this.historyIndex >= 0) {
                this.state = JSON.parse(JSON.stringify(this.history[this.historyIndex].state));
            } else {
                // No more history to undo - return to initial state
                this.state = JSON.parse(JSON.stringify(this.initialState));
            }
            return this.state;
        }
        return null;
    }

    /**
     * Redo last undone change
     */
    redo(): EnhancedResumeJSON | null {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.state = JSON.parse(JSON.stringify(this.history[this.historyIndex].state));
            return this.state;
        }
        return null;
    }

    /**
     * Check if undo is available
     */
    canUndo(): boolean {
        return this.historyIndex > 0;
    }

    /**
     * Check if redo is available
     */
    canRedo(): boolean {
        return this.historyIndex < this.history.length - 1;
    }

    /**
     * Get history length
     */
    getHistoryLength(): number {
        return this.history.length;
    }

    /**
     * Clear history
     */
    clearHistory(): void {
        this.history = [];
        this.historyIndex = -1;
    }
}

// ============================================================================
// CHANGE DETECTOR
// ============================================================================

class ChangeDetector {
    /**
     * Detect changes between old and new state
     */
    detectChanges(
        oldState: EnhancedResumeJSON,
        newState: EnhancedResumeJSON
    ): ChangePayload[] {
        const changes: ChangePayload[] = [];

        // Compare meta
        if (JSON.stringify(oldState.meta) !== JSON.stringify(newState.meta)) {
            changes.push({
                type: 'update',
                path: 'meta',
                value: newState.meta,
                previousValue: oldState.meta,
                metadata: {
                    nodeId: oldState.meta.id,
                    sectionId: 'meta'
                },
                timestamp: new Date().toISOString(),
                source: 'sync'
            });
        }

        // Compare basics
        if (JSON.stringify(oldState.basics) !== JSON.stringify(newState.basics)) {
            const basicChanges = this.detectObjectChanges(
                oldState.basics,
                newState.basics,
                'basics'
            );
            changes.push(...basicChanges);
        }

        // Compare sections
        const sectionChanges = this.detectSectionChanges(
            oldState.sections,
            newState.sections
        );
        changes.push(...sectionChanges);

        return changes;
    }

    /**
     * Detect changes in an object
     */
    private detectObjectChanges(
        oldObj: any,
        newObj: any,
        basePath: string
    ): ChangePayload[] {
        const changes: ChangePayload[] = [];

        // Check all keys in new object
        for (const key of Object.keys(newObj)) {
            const oldValue = oldObj[key];
            const newValue = newObj[key];

            if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
                if (typeof newValue === 'object' && newValue !== null && !Array.isArray(newValue)) {
                    // Recursively check nested objects
                    const nestedChanges = this.detectObjectChanges(
                        oldValue,
                        newValue,
                        `${basePath}.${key}`
                    );
                    changes.push(...nestedChanges);
                } else {
                    // Value changed
                    changes.push({
                        type: 'update',
                        path: `${basePath}.${key}`,
                        value: newValue,
                        previousValue: oldValue,
                        metadata: {
                            nodeId: oldObj.id || 'unknown',
                            sectionId: basePath.split('.')[0]
                        },
                        timestamp: new Date().toISOString(),
                        source: 'sync'
                    });
                }
            }
        }

        return changes;
    }

    /**
     * Detect changes in sections
     */
    private detectSectionChanges(
        oldSections: EnhancedResumeJSON['sections'],
        newSections: EnhancedResumeJSON['sections']
    ): ChangePayload[] {
        const changes: ChangePayload[] = [];

        // Check for added sections
        for (const newSection of newSections) {
            const oldSection = oldSections.find(s => s.id === newSection.id);
            if (!oldSection) {
                changes.push({
                    type: 'add',
                    path: 'sections',
                    value: newSection,
                    metadata: {
                        nodeId: newSection.id,
                        sectionId: newSection.id
                    },
                    timestamp: new Date().toISOString(),
                    source: 'sync'
                });
            }
        }

        // Check for removed sections
        for (const oldSection of oldSections) {
            const newSection = newSections.find(s => s.id === oldSection.id);
            if (!newSection) {
                changes.push({
                    type: 'remove',
                    path: 'sections',
                    previousValue: oldSection,
                    metadata: {
                        nodeId: oldSection.id,
                        sectionId: oldSection.id
                    },
                    timestamp: new Date().toISOString(),
                    source: 'sync'
                });
            }
        }

        // Check for modified sections
        for (const newSection of newSections) {
            const oldSection = oldSections.find(s => s.id === newSection.id);
            if (oldSection) {
                if (JSON.stringify(oldSection) !== JSON.stringify(newSection)) {
                    // Detect changes in section items
                    const itemChanges = this.detectItemChanges(
                        oldSection.items,
                        newSection.items,
                        newSection.id
                    );
                    changes.push(...itemChanges);
                }
            }
        }

        // Check for reordering
        const oldOrder = oldSections.map(s => s.id);
        const newOrder = newSections.map(s => s.id);
        if (JSON.stringify(oldOrder) !== JSON.stringify(newOrder)) {
            changes.push({
                type: 'reorder',
                path: 'sections',
                value: newOrder,
                previousValue: oldOrder,
                metadata: {
                    nodeId: 'root',
                    sectionId: 'root'
                },
                timestamp: new Date().toISOString(),
                source: 'sync'
            });
        }

        return changes;
    }

    /**
     * Detect changes in items within a section
     */
    private detectItemChanges(
        oldItems: any[],
        newItems: any[],
        sectionId: string
    ): ChangePayload[] {
        const changes: ChangePayload[] = [];

        // Check for added items
        for (const newItem of newItems) {
            const oldItem = oldItems.find(i => i.id === newItem.id);
            if (!oldItem) {
                changes.push({
                    type: 'add',
                    path: `sections.${sectionId}.items`,
                    value: newItem,
                    metadata: {
                        nodeId: newItem.id,
                        sectionId: sectionId
                    },
                    timestamp: new Date().toISOString(),
                    source: 'sync'
                });
            }
        }

        // Check for removed items
        for (const oldItem of oldItems) {
            const newItem = newItems.find(i => i.id === oldItem.id);
            if (!newItem) {
                changes.push({
                    type: 'remove',
                    path: `sections.${sectionId}.items`,
                    previousValue: oldItem,
                    metadata: {
                        nodeId: oldItem.id,
                        sectionId: sectionId
                    },
                    timestamp: new Date().toISOString(),
                    source: 'sync'
                });
            }
        }

        // Check for modified items
        for (const newItem of newItems) {
            const oldItem = oldItems.find(i => i.id === newItem.id);
            if (oldItem && JSON.stringify(oldItem) !== JSON.stringify(newItem)) {
                changes.push({
                    type: 'update',
                    path: `sections.${sectionId}.items.${newItem.id}`,
                    value: newItem,
                    previousValue: oldItem,
                    metadata: {
                        nodeId: newItem.id,
                        sectionId: sectionId
                    },
                    timestamp: new Date().toISOString(),
                    source: 'sync'
                });
            }
        }

        return changes;
    }

    /**
     * Resolve JSON path to value
     */
    resolvePath(state: EnhancedResumeJSON, path: string): any {
        const parts = path.split('.');
        let current: any = state;

        for (const part of parts) {
            // Handle array indices
            const arrayMatch = part.match(/^(.+)\[(\d+)\]$/);
            if (arrayMatch) {
                const [, key, index] = arrayMatch;
                current = current[key][parseInt(index)];
            } else {
                current = current[part];
            }

            if (current === undefined) {
                return undefined;
            }
        }

        return current;
    }
}

// ============================================================================
// SUBSCRIBER MANAGER
// ============================================================================

class SubscriberManager {
    private subscribers: Map<string, Subscriber> = new Map();

    /**
     * Subscribe to state changes
     */
    subscribe(id: string, callback: SubscriberCallback): void {
        this.subscribers.set(id, {
            id,
            callback,
            lastNotified: new Date().toISOString()
        });
    }

    /**
     * Unsubscribe
     */
    unsubscribe(id: string): void {
        this.subscribers.delete(id);
    }

    /**
     * Notify all subscribers
     */
    notifyAll(
        state: EnhancedResumeJSON,
        changes: ChangePayload[],
        source: ChangeSource
    ): void {
        Array.from(this.subscribers.entries()).forEach(([id, subscriber]) => {
            // Don't notify the source of the change
            if (id !== source) {
                try {
                    subscriber.callback(state, changes, source);
                    subscriber.lastNotified = new Date().toISOString();
                } catch (error) {
                    console.error(`Error notifying subscriber ${id}:`, error);
                }
            }
        });
    }

    /**
     * Get subscriber count
     */
    getSubscriberCount(): number {
        return this.subscribers.size;
    }

    /**
     * Check if subscriber exists
     */
    hasSubscriber(id: string): boolean {
        return this.subscribers.has(id);
    }

    /**
     * Get all subscriber IDs
     */
    getSubscriberIds(): string[] {
        return Array.from(this.subscribers.keys());
    }
}

// ============================================================================
// PERSISTENCE LAYER
// ============================================================================

class PersistenceLayer {
    private saveTimeout: NodeJS.Timeout | null = null;
    private debounceMs: number = 500;
    private pendingState: EnhancedResumeJSON | null = null;
    private isSaving: boolean = false;
    private cvId: string;

    constructor(cvId: string, debounceMs: number = 500) {
        this.cvId = cvId;
        this.debounceMs = debounceMs;
    }

    /**
     * Save state (debounced)
     */
    saveState(state: EnhancedResumeJSON): void {
        this.pendingState = state;

        // Clear existing timeout
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }

        // Set new timeout
        this.saveTimeout = setTimeout(() => {
            this.persistState();
        }, this.debounceMs);
    }

    /**
     * Persist state to database
     */
    private async persistState(): Promise<void> {
        if (!this.pendingState || this.isSaving) {
            return;
        }

        this.isSaving = true;
        const stateToSave = this.pendingState;
        this.pendingState = null;

        try {
            // Save to database
            await this.saveToDatabase(stateToSave);

            // Save to sync history
            await this.saveToSyncHistory(stateToSave);

            console.log('✅ State persisted successfully');
        } catch (error) {
            console.error('❌ Failed to persist state:', error);

            // Rollback on failure
            this.handleSaveFailure(stateToSave, error);
        } finally {
            this.isSaving = false;
        }
    }

    /**
     * Save to database
     */
    private async saveToDatabase(state: EnhancedResumeJSON): Promise<void> {
        // Update CV in database
        const response = await fetch(`/api/cvs/${this.cvId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                resumeData: state,
                version: state.meta.version
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to save: ${response.statusText}`);
        }
    }

    /**
     * Save to sync history
     */
    private async saveToSyncHistory(state: EnhancedResumeJSON): Promise<void> {
        // Save to sync history collection
        await fetch('/api/sync-history', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                cvId: this.cvId,
                version: state.meta.version,
                timestamp: new Date().toISOString()
            })
        });
    }

    /**
     * Handle save failure
     */
    private handleSaveFailure(state: EnhancedResumeJSON, error: any): void {
        // Notify subscribers of failure
        // This allows UI to show error message and potentially retry
        console.error('Failed to persist state:', error);

        // Retry after delay (with max retry limit to prevent infinite loops)
        const maxRetries = 3;
        const currentRetries = (state as any).__retryCount || 0;

        if (currentRetries < maxRetries) {
            (state as any).__retryCount = currentRetries + 1;
            setTimeout(() => {
                this.saveState(state);
            }, 1000 * (currentRetries + 1)); // Exponential backoff
        } else {
            console.error('Max retries reached, giving up on save');
        }
    }

    /**
     * Force immediate save (bypass debounce)
     */
    async forceSave(state: EnhancedResumeJSON): Promise<void> {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
        }

        this.pendingState = state;
        await this.persistState();
    }

    /**
     * Set debounce interval
     */
    setDebounceMs(ms: number): void {
        this.debounceMs = ms;
    }

    /**
     * Check if currently saving
     */
    isCurrentlySaving(): boolean {
        return this.isSaving;
    }
}

// ============================================================================
// MAIN SYNC ENGINE
// ============================================================================

export class SyncEngine {
    private stateManager: StateManager;
    private changeDetector: ChangeDetector;
    private subscriberManager: SubscriberManager;
    private persistenceLayer: PersistenceLayer;
    private config: SyncEngineConfig;

    constructor(
        initialState: EnhancedResumeJSON,
        cvId: string,
        config: SyncEngineConfig = {}
    ) {
        this.config = {
            debounceMs: 500,
            maxHistorySize: 50,
            enableUndoRedo: true,
            conflictStrategy: 'last-write-wins',
            ...config
        };

        this.stateManager = new StateManager(
            initialState,
            this.config.maxHistorySize
        );
        this.changeDetector = new ChangeDetector();
        this.subscriberManager = new SubscriberManager();
        this.persistenceLayer = new PersistenceLayer(
            cvId,
            this.config.debounceMs
        );
    }

    /**
     * Main change handler
     */
    onChange(source: ChangeSource, payload: ChangePayload): void {
        // 1. Get current state
        const currentState = this.stateManager.getState();

        // 2. Apply change to create new state
        const newState = this.applyChange(currentState, payload);

        // 3. Detect changes
        const changes = this.changeDetector.detectChanges(currentState, newState);

        // 4. Update state
        this.stateManager.setState(newState, source);

        // 5. Notify subscribers
        this.subscriberManager.notifyAll(newState, changes, source);

        // 6. Persist to database (debounced)
        this.persistenceLayer.saveState(newState);
    }

    /**
     * Apply a change to the state
     */
    private applyChange(
        state: EnhancedResumeJSON,
        payload: ChangePayload
    ): EnhancedResumeJSON {
        const newState = JSON.parse(JSON.stringify(state)); // Deep clone

        switch (payload.type) {
            case 'update':
                return this.applyUpdate(newState, payload);

            case 'add':
                return this.applyAdd(newState, payload);

            case 'remove':
                return this.applyRemove(newState, payload);

            case 'reorder':
                return this.applyReorder(newState, payload);

            default:
                return newState;
        }
    }

    /**
     * Apply update change
     */
    private applyUpdate(
        state: EnhancedResumeJSON,
        payload: ChangePayload
    ): EnhancedResumeJSON {
        const pathParts = payload.path.split('.');
        let current: any = state;

        // Navigate to parent
        for (let i = 0; i < pathParts.length - 1; i++) {
            const part = pathParts[i];
            const arrayMatch = part.match(/^(.+)\[(\d+)\]$/);

            if (arrayMatch) {
                const [, key, index] = arrayMatch;
                current = current[key][parseInt(index)];
            } else {
                current = current[part];
            }
        }

        // Apply update
        const lastPart = pathParts[pathParts.length - 1];
        const arrayMatch = lastPart.match(/^(.+)\[(\d+)\]$/);

        if (arrayMatch) {
            const [, key, index] = arrayMatch;
            current[key][parseInt(index)] = payload.value;
        } else {
            current[lastPart] = payload.value;
        }

        return state;
    }

    /**
     * Apply add change
     */
    private applyAdd(
        state: EnhancedResumeJSON,
        payload: ChangePayload
    ): EnhancedResumeJSON {
        const pathParts = payload.path.split('.');
        let current: any = state;

        // Navigate to parent
        for (let i = 0; i < pathParts.length - 1; i++) {
            const part = pathParts[i];
            current = current[part];
        }

        // Add to array
        const lastPart = pathParts[pathParts.length - 1];
        if (Array.isArray(current[lastPart])) {
            current[lastPart].push(payload.value);
        }

        return state;
    }

    /**
     * Apply remove change
     */
    private applyRemove(
        state: EnhancedResumeJSON,
        payload: ChangePayload
    ): EnhancedResumeJSON {
        const pathParts = payload.path.split('.');
        let current: any = state;

        // Navigate to parent
        for (let i = 0; i < pathParts.length - 1; i++) {
            const part = pathParts[i];
            current = current[part];
        }

        // Remove from array
        const lastPart = pathParts[pathParts.length - 1];
        if (Array.isArray(current[lastPart])) {
            const index = current[lastPart].findIndex(
                (item: any) => item.id === payload.metadata.nodeId
            );
            if (index !== -1) {
                current[lastPart].splice(index, 1);
            }
        }

        return state;
    }

    /**
     * Apply reorder change
     */
    private applyReorder(
        state: EnhancedResumeJSON,
        payload: ChangePayload
    ): EnhancedResumeJSON {
        const pathParts = payload.path.split('.');
        let current: any = state;

        // Navigate to parent
        for (let i = 0; i < pathParts.length - 1; i++) {
            const part = pathParts[i];
            current = current[part];
        }

        // Reorder array
        const lastPart = pathParts[pathParts.length - 1];
        if (Array.isArray(current[lastPart]) && Array.isArray(payload.value)) {
            const reordered = payload.value.map((id: string) =>
                current[lastPart].find((item: any) => item.id === id)
            ).filter(Boolean);

            current[lastPart] = reordered;
        }

        return state;
    }

    /**
     * Subscribe to changes
     */
    subscribe(id: string, callback: SubscriberCallback): void {
        this.subscriberManager.subscribe(id, callback);
    }

    /**
     * Unsubscribe
     */
    unsubscribe(id: string): void {
        this.subscriberManager.unsubscribe(id);
    }

    /**
     * Get current state
     */
    getState(): EnhancedResumeJSON {
        return this.stateManager.getState();
    }

    /**
     * Undo last change
     */
    undo(): EnhancedResumeJSON | null {
        if (!this.config.enableUndoRedo) {
            console.warn('Undo/redo is disabled');
            return null;
        }

        const newState = this.stateManager.undo();
        if (newState) {
            this.subscriberManager.notifyAll(newState, [], 'sync');
            this.persistenceLayer.saveState(newState);
        }
        return newState;
    }

    /**
     * Redo last undone change
     */
    redo(): EnhancedResumeJSON | null {
        if (!this.config.enableUndoRedo) {
            console.warn('Undo/redo is disabled');
            return null;
        }

        const newState = this.stateManager.redo();
        if (newState) {
            this.subscriberManager.notifyAll(newState, [], 'sync');
            this.persistenceLayer.saveState(newState);
        }
        return newState;
    }

    /**
     * Check if undo is available
     */
    canUndo(): boolean {
        return (this.config.enableUndoRedo ?? true) && this.stateManager.canUndo();
    }

    /**
     * Check if redo is available
     */
    canRedo(): boolean {
        return (this.config.enableUndoRedo ?? true) && this.stateManager.canRedo();
    }

    /**
     * Force immediate save
     */
    async forceSave(): Promise<void> {
        await this.persistenceLayer.forceSave(this.stateManager.getState());
    }

    /**
     * Get subscriber count
     */
    getSubscriberCount(): number {
        return this.subscriberManager.getSubscriberCount();
    }

    /**
     * Get subscriber IDs
     */
    getSubscriberIds(): string[] {
        return this.subscriberManager.getSubscriberIds();
    }

    /**
     * Check if currently saving
     */
    isSaving(): boolean {
        return this.persistenceLayer.isCurrentlySaving();
    }

    /**
     * Get history length
     */
    getHistoryLength(): number {
        return this.stateManager.getHistoryLength();
    }

    /**
     * Clear history
     */
    clearHistory(): void {
        this.stateManager.clearHistory();
    }

    /**
     * Update configuration
     */
    updateConfig(config: Partial<SyncEngineConfig>): void {
        this.config = { ...this.config, ...config };

        if (config.debounceMs !== undefined) {
            this.persistenceLayer.setDebounceMs(config.debounceMs);
        }
    }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create a new sync engine instance
 */
export function createSyncEngine(
    initialState: EnhancedResumeJSON,
    cvId: string,
    config?: SyncEngineConfig
): SyncEngine {
    return new SyncEngine(initialState, cvId, config);
}
