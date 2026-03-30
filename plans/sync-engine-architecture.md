# Sync Engine Architecture

## Overview

The Sync Engine is the critical infrastructure that enables real-time synchronization between the form layer, editor layer, and preview layer. It ensures that any change made in one layer is immediately reflected in all other layers, with the JSON state as the single source of truth.

---

## Design Principles

1. **Single Source of Truth** - JSON state owns everything
2. **Pub/Sub Pattern** - Decoupled components
3. **Optimistic Updates** - Immediate UI feedback
4. **Debounced Persistence** - Efficient database writes
5. **Conflict Resolution** - Handle concurrent edits
6. **Undo/Redo** - Full change history

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    SYNC ENGINE                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │              State Manager                        │  │
│  │  • Current state (EnhancedResumeJSON)            │  │
│  │  • Change history (undo/redo stack)              │  │
│  │  • Version tracking                              │  │
│  └──────────────────────────────────────────────────┘  │
│                           │                             │
│                           ▼                             │
│  ┌──────────────────────────────────────────────────┐  │
│  │              Change Detector                      │  │
│  │  • Diff algorithm                                │  │
│  │  • Path resolution                               │  │
│  │  • Conflict detection                            │  │
│  └──────────────────────────────────────────────────┘  │
│                           │                             │
│                           ▼                             │
│  ┌──────────────────────────────────────────────────┐  │
│  │              Subscriber Manager                   │  │
│  │  • Form subscriber                               │  │
│  │  • Editor subscriber                             │  │
│  │  • Preview subscriber                            │  │
│  │  • AI subscriber                                 │  │
│  └──────────────────────────────────────────────────┘  │
│                           │                             │
│                           ▼                             │
│  ┌──────────────────────────────────────────────────┐  │
│  │              Persistence Layer                    │  │
│  │  • Debounced save (500ms)                        │  │
│  │  • Optimistic updates                            │  │
│  │  • Rollback on failure                           │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
        │              │              │              │
        ▼              ▼              ▼              ▼
   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
   │  Form   │   │ Editor  │   │ Preview │   │   AI    │
   │  Layer  │   │  Layer  │   │  Layer  │   │  Layer  │
   └─────────┘   └─────────┘   └─────────┘   └─────────┘
```

---

## Core Components

### 1. State Manager

```typescript
class StateManager {
  private state: EnhancedResumeJSON;
  private history: HistoryEntry[] = [];
  private historyIndex: number = -1;
  private maxHistorySize: number = 50;
  
  // Get current state
  getState(): EnhancedResumeJSON {
    return this.state;
  }
  
  // Update state
  setState(newState: EnhancedResumeJSON, source: ChangeSource): void {
    // Save to history before updating
    this.saveToHistory(this.state, source);
    
    // Update state
    this.state = newState;
    
    // Increment version
    this.state.meta.version++;
    this.state.meta.lastModified = new Date().toISOString();
  }
  
  // Save to history for undo/redo
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
  
  // Undo
  undo(): EnhancedResumeJSON | null {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.state = JSON.parse(JSON.stringify(this.history[this.historyIndex].state));
      return this.state;
    }
    return null;
  }
  
  // Redo
  redo(): EnhancedResumeJSON | null {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.state = JSON.parse(JSON.stringify(this.history[this.historyIndex].state));
      return this.state;
    }
    return null;
  }
  
  // Check if undo is available
  canUndo(): boolean {
    return this.historyIndex > 0;
  }
  
  // Check if redo is available
  canRedo(): boolean {
    return this.historyIndex < this.history.length - 1;
  }
}

interface HistoryEntry {
  state: EnhancedResumeJSON;
  timestamp: string;
  source: ChangeSource;
}

type ChangeSource = 'form' | 'editor' | 'ai' | 'sync' | 'migration';
```

### 2. Change Detector

```typescript
class ChangeDetector {
  // Detect changes between old and new state
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
  
  // Detect changes in an object
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
  
  // Detect changes in sections
  private detectSectionChanges(
    oldSections: ResumeSection[],
    newSections: ResumeSection[]
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
          const sectionChanges = this.detectSectionChanges(
            oldSection.items,
            newSection.items
          );
          changes.push(...sectionChanges);
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
  
  // Resolve JSON path to value
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
```

### 3. Subscriber Manager

```typescript
class SubscriberManager {
  private subscribers: Map<string, Subscriber> = new Map();
  
  // Subscribe to state changes
  subscribe(id: string, callback: SubscriberCallback): void {
    this.subscribers.set(id, {
      id,
      callback,
      lastNotified: new Date().toISOString()
    });
  }
  
  // Unsubscribe
  unsubscribe(id: string): void {
    this.subscribers.delete(id);
  }
  
  // Notify all subscribers
  notifyAll(
    state: EnhancedResumeJSON,
    changes: ChangePayload[],
    source: ChangeSource
  ): void {
    for (const [id, subscriber] of this.subscribers) {
      // Don't notify the source of the change
      if (id !== source) {
        try {
          subscriber.callback(state, changes, source);
          subscriber.lastNotified = new Date().toISOString();
        } catch (error) {
          console.error(`Error notifying subscriber ${id}:`, error);
        }
      }
    }
  }
  
  // Get subscriber count
  getSubscriberCount(): number {
    return this.subscribers.size;
  }
  
  // Check if subscriber exists
  hasSubscriber(id: string): boolean {
    return this.subscribers.has(id);
  }
}

interface Subscriber {
  id: string;
  callback: SubscriberCallback;
  lastNotified: string;
}

type SubscriberCallback = (
  state: EnhancedResumeJSON,
  changes: ChangePayload[],
  source: ChangeSource
) => void;
```

### 4. Persistence Layer

```typescript
class PersistenceLayer {
  private saveTimeout: NodeJS.Timeout | null = null;
  private debounceMs: number = 500;
  private pendingState: EnhancedResumeJSON | null = null;
  private isSaving: boolean = false;
  
  // Save state (debounced)
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
  
  // Persist state to database
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
  
  // Save to database
  private async saveToDatabase(state: EnhancedResumeJSON): Promise<void> {
    // Update CV in database
    const response = await fetch(`/api/cvs/${state.meta.id}`, {
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
  
  // Save to sync history
  private async saveToSyncHistory(state: EnhancedResumeJSON): Promise<void> {
    // Save to sync history collection
    await fetch('/api/sync-history', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        cvId: state.meta.id,
        version: state.meta.version,
        timestamp: new Date().toISOString()
      })
    });
  }
  
  // Handle save failure
  private handleSaveFailure(state: EnhancedResumeJSON, error: any): void {
    // Notify subscribers of failure
    // This allows UI to show error message and potentially retry
    console.error('Save failed, state will be retried:', error);
    
    // Retry after delay
    setTimeout(() => {
      this.saveState(state);
    }, 1000);
  }
  
  // Force immediate save (bypass debounce)
  async forceSave(state: EnhancedResumeJSON): Promise<void> {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    
    this.pendingState = state;
    await this.persistState();
  }
  
  // Set debounce interval
  setDebounceMs(ms: number): void {
    this.debounceMs = ms;
  }
}
```

---

## Main Sync Engine

```typescript
class SyncEngine {
  private stateManager: StateManager;
  private changeDetector: ChangeDetector;
  private subscriberManager: SubscriberManager;
  private persistenceLayer: PersistenceLayer;
  
  constructor(initialState: EnhancedResumeJSON) {
    this.stateManager = new StateManager();
    this.changeDetector = new ChangeDetector();
    this.subscriberManager = new SubscriberManager();
    this.persistenceLayer = new PersistenceLayer();
    
    // Initialize state
    this.stateManager.setState(initialState, 'sync');
  }
  
  // Main change handler
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
  
  // Apply a change to the state
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
  
  // Apply update change
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
  
  // Apply add change
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
  
  // Apply remove change
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
  
  // Apply reorder change
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
  
  // Subscribe to changes
  subscribe(id: string, callback: SubscriberCallback): void {
    this.subscriberManager.subscribe(id, callback);
  }
  
  // Unsubscribe
  unsubscribe(id: string): void {
    this.subscriberManager.unsubscribe(id);
  }
  
  // Get current state
  getState(): EnhancedResumeJSON {
    return this.stateManager.getState();
  }
  
  // Undo
  undo(): EnhancedResumeJSON | null {
    const newState = this.stateManager.undo();
    if (newState) {
      this.subscriberManager.notifyAll(newState, [], 'sync');
      this.persistenceLayer.saveState(newState);
    }
    return newState;
  }
  
  // Redo
  redo(): EnhancedResumeJSON | null {
    const newState = this.stateManager.redo();
    if (newState) {
      this.subscriberManager.notifyAll(newState, [], 'sync');
      this.persistenceLayer.saveState(newState);
    }
    return newState;
  }
  
  // Check if undo is available
  canUndo(): boolean {
    return this.stateManager.canUndo();
  }
  
  // Check if redo is available
  canRedo(): boolean {
    return this.stateManager.canRedo();
  }
  
  // Force immediate save
  async forceSave(): Promise<void> {
    await this.persistenceLayer.forceSave(this.stateManager.getState());
  }
}
```

---

## Usage Examples

### Form Integration
```typescript
// Form component
const ResumeForm: React.FC<{ syncEngine: SyncEngine }> = ({ syncEngine }) => {
  const [state, setState] = useState(syncEngine.getState());
  
  // Subscribe to changes
  useEffect(() => {
    const handleStateChange = (newState: EnhancedResumeJSON) => {
      setState(newState);
    };
    
    syncEngine.subscribe('form', handleStateChange);
    
    return () => {
      syncEngine.unsubscribe('form');
    };
  }, [syncEngine]);
  
  // Handle form change
  const handleNameChange = (name: string) => {
    syncEngine.onChange('form', {
      type: 'update',
      path: 'basics.name',
      value: name,
      previousValue: state.basics.name,
      metadata: {
        nodeId: state.basics.id,
        sectionId: 'basics'
      },
      timestamp: new Date().toISOString(),
      source: 'form'
    });
  };
  
  return (
    <form>
      <input
        value={state.basics.name}
        onChange={(e) => handleNameChange(e.target.value)}
      />
    </form>
  );
};
```

### Editor Integration
```typescript
// Editor component
const ResumeEditor: React.FC<{ syncEngine: SyncEngine }> = ({ syncEngine }) => {
  const [state, setState] = useState(syncEngine.getState());
  
  // Subscribe to changes
  useEffect(() => {
    const handleStateChange = (newState: EnhancedResumeJSON) => {
      setState(newState);
    };
    
    syncEngine.subscribe('editor', handleStateChange);
    
    return () => {
      syncEngine.unsubscribe('editor');
    };
  }, [syncEngine]);
  
  // Handle editor change
  const handleCompanyChange = (sectionId: string, itemId: string, company: string) => {
    syncEngine.onChange('editor', {
      type: 'update',
      path: `sections[${sectionId}].items[${itemId}].company`,
      value: company,
      metadata: {
        nodeId: itemId,
        sectionId: sectionId
      },
      timestamp: new Date().toISOString(),
      source: 'editor'
    });
  };
  
  return (
    <div>
      {/* TipTap editor implementation */}
    </div>
  );
};
```

### Preview Integration
```typescript
// Preview component
const ResumePreview: React.FC<{ syncEngine: SyncEngine }> = ({ syncEngine }) => {
  const [state, setState] = useState(syncEngine.getState());
  
  // Subscribe to changes
  useEffect(() => {
    const handleStateChange = (newState: EnhancedResumeJSON) => {
      setState(newState);
    };
    
    syncEngine.subscribe('preview', handleStateChange);
    
    return () => {
      syncEngine.unsubscribe('preview');
    };
  }, [syncEngine]);
  
  return (
    <div>
      <TemplateRenderer cvData={state} template={template} />
    </div>
  );
};
```

---

## Performance Optimizations

### 1. Debounced Updates
- Form inputs: 300ms debounce
- Editor changes: 100ms debounce
- Database saves: 500ms debounce

### 2. Selective Updates
- Only notify subscribers of changed sections
- Use React.memo for preview components
- Virtual scrolling for long lists

### 3. Optimistic Updates
- Update UI immediately
- Rollback on failure
- Show loading states for async operations

### 4. Caching
- Cache AI responses
- Cache template renders
- Cache PDF generations

---

## Error Handling

### 1. Save Failures
```typescript
// Retry logic
private async saveWithRetry(state: EnhancedResumeJSON, retries: number = 3): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      await this.saveToDatabase(state);
      return;
    } catch (error) {
      if (i === retries - 1) {
        throw error;
      }
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

### 2. Conflict Resolution
```typescript
// Conflict detection
private detectConflict(
  localVersion: number,
  remoteVersion: number
): boolean {
  return localVersion !== remoteVersion;
}

// Conflict resolution strategies
type ConflictStrategy = 'last-write-wins' | 'merge' | 'manual';

// Last-write-wins
private resolveLastWriteWins(
  localState: EnhancedResumeJSON,
  remoteState: EnhancedResumeJSON
): EnhancedResumeJSON {
  const localTime = new Date(localState.meta.lastModified).getTime();
  const remoteTime = new Date(remoteState.meta.lastModified).getTime();
  
  return localTime > remoteTime ? localState : remoteState;
}
```

---

## Testing Strategy

### 1. Unit Tests
- State manager operations
- Change detection
- Path resolution
- Undo/redo functionality

### 2. Integration Tests
- Form ↔ sync engine
- Editor ↔ sync engine
- Preview ↔ sync engine
- Database persistence

### 3. Performance Tests
- Large resume handling
- Rapid changes
- Concurrent edits
- Memory usage

---

**Document Version:** 1.0  
**Last Updated:** 2026-03-27  
**Author:** CV Circle Engineering Team
