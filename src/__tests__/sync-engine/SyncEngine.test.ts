import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SyncEngine } from '@/lib/sync-engine/SyncEngine';
import { EnhancedResumeJSON, ChangePayload } from '@/types/enhanced-resume-schema';

// Mock data for testing
const mockResumeData: EnhancedResumeJSON = {
    meta: {
        id: 'test-resume-1',
        templateId: 'default',
        theme: {
            font: 'Inter',
            spacing: 1.2,
            primaryColor: '#000000',
            secondaryColor: '#666666',
            backgroundColor: '#ffffff',
            fontSize: '11pt',
            lineHeight: '1.2'
        },
        version: 1,
        lastModified: new Date().toISOString(),
        createdAt: new Date().toISOString()
    },
    basics: {
        id: 'basics-1',
        name: 'John Doe',
        label: 'Software Engineer',
        image: '',
        email: 'john@example.com',
        phone: '+1234567890',
        url: 'https://johndoe.com',
        summary: 'Experienced software engineer',
        location: {
            id: 'location-1',
            address: '123 Main St',
            postalCode: '12345',
            city: 'San Francisco',
            countryCode: 'US',
            region: 'CA'
        },
        profiles: [
            {
                id: 'profile-1',
                network: 'linkedin',
                username: 'johndoe',
                url: 'https://linkedin.com/in/johndoe'
            }
        ]
    },
    sections: [
        {
            id: 'section-1',
            type: 'experience',
            visible: true,
            order: 0,
            items: [
                {
                    id: 'exp-1',
                    company: 'Tech Corp',
                    position: 'Senior Engineer',
                    url: 'https://techcorp.com',
                    startDate: '2020-01',
                    endDate: '',
                    current: true,
                    summary: 'Led development team',
                    highlights: [
                        { id: 'highlight-1', text: 'Improved performance by 50%' }
                    ]
                }
            ]
        },
        {
            id: 'section-2',
            type: 'education',
            visible: true,
            order: 1,
            items: [
                {
                    id: 'edu-1',
                    institution: 'Stanford University',
                    url: 'https://stanford.edu',
                    area: 'Computer Science',
                    studyType: 'Bachelor',
                    startDate: '2016-09',
                    endDate: '2020-06',
                    score: '3.8',
                    courses: ['Algorithms', 'Data Structures']
                }
            ]
        }
    ]
};

describe('SyncEngine', () => {
    let syncEngine: SyncEngine;
    let mockFetch: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        // Reset mocks
        vi.clearAllMocks();

        // Mock fetch
        mockFetch = vi.fn();
        global.fetch = mockFetch;

        // Create fresh instance
        syncEngine = new SyncEngine(mockResumeData, 'test-cv-1');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Initialization', () => {
        it('should initialize with correct data', () => {
            const state = syncEngine.getState();
            expect(state).toEqual(mockResumeData);
            expect(state.meta.id).toBe('test-resume-1');
            expect(state.basics.name).toBe('John Doe');
        });

        it('should initialize with initial state in history', () => {
            // Initial state is saved to history to enable redo back to initial state
            expect(syncEngine.getHistoryLength()).toBe(1);
        });

        it('should initialize with no subscribers', () => {
            expect(syncEngine.getSubscriberCount()).toBe(0);
        });
    });

    describe('State Updates via onChange', () => {
        it('should update state when onChange is called', () => {
            const payload: ChangePayload = {
                type: 'update',
                path: 'basics.name',
                value: 'Jane Doe',
                metadata: {
                    nodeId: 'basics-1',
                    sectionId: 'basics'
                },
                timestamp: new Date().toISOString(),
                source: 'form'
            };

            syncEngine.onChange('form', payload);
            const state = syncEngine.getState();
            expect(state.basics.name).toBe('Jane Doe');
        });

        it('should increment version on state update', () => {
            const initialVersion = syncEngine.getState().meta.version;

            const payload: ChangePayload = {
                type: 'update',
                path: 'basics.name',
                value: 'Jane Doe',
                metadata: {
                    nodeId: 'basics-1',
                    sectionId: 'basics'
                },
                timestamp: new Date().toISOString(),
                source: 'form'
            };

            syncEngine.onChange('form', payload);
            expect(syncEngine.getState().meta.version).toBe(initialVersion + 1);
        });

        it('should update lastModified timestamp on state update', () => {
            const initialTimestamp = syncEngine.getState().meta.lastModified;

            // Wait a bit to ensure different timestamp
            vi.useFakeTimers();
            vi.advanceTimersByTime(1000);

            const payload: ChangePayload = {
                type: 'update',
                path: 'basics.name',
                value: 'Jane Doe',
                metadata: {
                    nodeId: 'basics-1',
                    sectionId: 'basics'
                },
                timestamp: new Date().toISOString(),
                source: 'form'
            };

            syncEngine.onChange('form', payload);
            expect(syncEngine.getState().meta.lastModified).not.toBe(initialTimestamp);
            vi.useRealTimers();
        });
    });

    describe('Undo/Redo', () => {
        it('should push state to history on update', () => {
            const payload: ChangePayload = {
                type: 'update',
                path: 'basics.name',
                value: 'Jane Doe',
                metadata: {
                    nodeId: 'basics-1',
                    sectionId: 'basics'
                },
                timestamp: new Date().toISOString(),
                source: 'form'
            };

            syncEngine.onChange('form', payload);
            // Initial state + new state = 2 entries
            expect(syncEngine.getHistoryLength()).toBe(2);
        });

        it('should undo state changes', () => {
            const originalName = syncEngine.getState().basics.name;

            const payload: ChangePayload = {
                type: 'update',
                path: 'basics.name',
                value: 'Jane Doe',
                metadata: {
                    nodeId: 'basics-1',
                    sectionId: 'basics'
                },
                timestamp: new Date().toISOString(),
                source: 'form'
            };

            syncEngine.onChange('form', payload);
            expect(syncEngine.getState().basics.name).toBe('Jane Doe');

            const undoneState = syncEngine.undo();
            expect(undoneState).not.toBeNull();
            expect(syncEngine.getState().basics.name).toBe(originalName);
        });

        it('should redo state changes', () => {
            const originalName = syncEngine.getState().basics.name;

            const payload: ChangePayload = {
                type: 'update',
                path: 'basics.name',
                value: 'Jane Doe',
                metadata: {
                    nodeId: 'basics-1',
                    sectionId: 'basics'
                },
                timestamp: new Date().toISOString(),
                source: 'form'
            };

            syncEngine.onChange('form', payload);
            syncEngine.undo();
            expect(syncEngine.getState().basics.name).toBe(originalName);

            const redoneState = syncEngine.redo();
            expect(redoneState).not.toBeNull();
            expect(syncEngine.getState().basics.name).toBe('Jane Doe');
        });

        it('should clear redo stack on new change', () => {
            const payload: ChangePayload = {
                type: 'update',
                path: 'basics.name',
                value: 'Jane Doe',
                metadata: {
                    nodeId: 'basics-1',
                    sectionId: 'basics'
                },
                timestamp: new Date().toISOString(),
                source: 'form'
            };

            syncEngine.onChange('form', payload);
            syncEngine.undo();
            // Initial state + first change = 2 entries
            expect(syncEngine.getHistoryLength()).toBe(2);

            syncEngine.onChange('form', payload);
            // Initial state + new change = 2 entries (redo stack cleared)
            expect(syncEngine.getHistoryLength()).toBe(2);
        });

        it('should limit history size', () => {
            // Create engine with small history size
            const smallHistoryEngine = new SyncEngine(mockResumeData, 'test-cv-1', {
                maxHistorySize: 3
            });

            // Push more than history size
            for (let i = 0; i < 5; i++) {
                const payload: ChangePayload = {
                    type: 'update',
                    path: 'basics.name',
                    value: `Name ${i}`,
                    metadata: {
                        nodeId: 'basics-1',
                        sectionId: 'basics'
                    },
                    timestamp: new Date().toISOString(),
                    source: 'form'
                };
                smallHistoryEngine.onChange('form', payload);
            }

            expect(smallHistoryEngine.getHistoryLength()).toBe(3);
        });
    });

    describe('Subscriptions', () => {
        it('should notify subscribers on state change', () => {
            const subscriber = vi.fn();
            syncEngine.subscribe('test-subscriber', subscriber);

            const payload: ChangePayload = {
                type: 'update',
                path: 'basics.name',
                value: 'Jane Doe',
                metadata: {
                    nodeId: 'basics-1',
                    sectionId: 'basics'
                },
                timestamp: new Date().toISOString(),
                source: 'form'
            };

            syncEngine.onChange('form', payload);

            expect(subscriber).toHaveBeenCalledTimes(1);
            expect(subscriber).toHaveBeenCalledWith(
                expect.objectContaining({
                    basics: expect.objectContaining({ name: 'Jane Doe' })
                }),
                expect.any(Array),
                'form'
            );
        });

        it('should not notify unsubscribed subscribers', () => {
            const subscriber = vi.fn();
            syncEngine.subscribe('test-subscriber', subscriber);
            syncEngine.unsubscribe('test-subscriber');

            const payload: ChangePayload = {
                type: 'update',
                path: 'basics.name',
                value: 'Jane Doe',
                metadata: {
                    nodeId: 'basics-1',
                    sectionId: 'basics'
                },
                timestamp: new Date().toISOString(),
                source: 'form'
            };

            syncEngine.onChange('form', payload);

            expect(subscriber).not.toHaveBeenCalled();
        });

        it('should notify multiple subscribers', () => {
            const subscriber1 = vi.fn();
            const subscriber2 = vi.fn();

            syncEngine.subscribe('subscriber-1', subscriber1);
            syncEngine.subscribe('subscriber-2', subscriber2);

            const payload: ChangePayload = {
                type: 'update',
                path: 'basics.name',
                value: 'Jane Doe',
                metadata: {
                    nodeId: 'basics-1',
                    sectionId: 'basics'
                },
                timestamp: new Date().toISOString(),
                source: 'form'
            };

            syncEngine.onChange('form', payload);

            expect(subscriber1).toHaveBeenCalledTimes(1);
            expect(subscriber2).toHaveBeenCalledTimes(1);
        });

        it('should pass changes to subscribers', () => {
            const subscriber = vi.fn();
            syncEngine.subscribe('test-subscriber', subscriber);

            const payload: ChangePayload = {
                type: 'update',
                path: 'basics.name',
                value: 'Jane Doe',
                metadata: {
                    nodeId: 'basics-1',
                    sectionId: 'basics'
                },
                timestamp: new Date().toISOString(),
                source: 'form'
            };

            syncEngine.onChange('form', payload);

            const changes = subscriber.mock.calls[0][1];
            expect(changes).toHaveLength(1);
            expect(changes[0].type).toBe('update');
            expect(changes[0].path).toBe('basics.name');
        });
    });

    describe('Persistence', () => {
        it('should debounce persistence calls', async () => {
            vi.useFakeTimers();

            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ success: true })
            });

            const payload: ChangePayload = {
                type: 'update',
                path: 'basics.name',
                value: 'Jane Doe',
                metadata: {
                    nodeId: 'basics-1',
                    sectionId: 'basics'
                },
                timestamp: new Date().toISOString(),
                source: 'form'
            };

            syncEngine.onChange('form', payload);

            // Should not have called fetch yet
            expect(mockFetch).not.toHaveBeenCalled();

            // Advance timers past debounce delay
            vi.advanceTimersByTime(600);

            // Should have called fetch once
            expect(mockFetch).toHaveBeenCalledTimes(1);

            vi.useRealTimers();
        });

        it('should batch multiple rapid changes', async () => {
            vi.useFakeTimers();

            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ success: true })
            });

            // Make multiple rapid changes
            for (let i = 0; i < 3; i++) {
                const payload: ChangePayload = {
                    type: 'update',
                    path: 'basics.name',
                    value: `Name ${i}`,
                    metadata: {
                        nodeId: 'basics-1',
                        sectionId: 'basics'
                    },
                    timestamp: new Date().toISOString(),
                    source: 'form'
                };
                syncEngine.onChange('form', payload);
            }

            // Advance timers past debounce delay
            vi.advanceTimersByTime(600);

            // Should have called fetch only once with final state
            expect(mockFetch).toHaveBeenCalledTimes(1);

            vi.useRealTimers();
        });

        it('should call correct API endpoint', async () => {
            vi.useFakeTimers();

            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ success: true })
            });

            const payload: ChangePayload = {
                type: 'update',
                path: 'basics.name',
                value: 'Jane Doe',
                metadata: {
                    nodeId: 'basics-1',
                    sectionId: 'basics'
                },
                timestamp: new Date().toISOString(),
                source: 'form'
            };

            syncEngine.onChange('form', payload);

            vi.advanceTimersByTime(600);

            expect(mockFetch).toHaveBeenCalledWith(
                '/api/cvs/test-cv-1',
                expect.objectContaining({
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' }
                })
            );

            vi.useRealTimers();
        });

        it('should handle persistence errors gracefully', async () => {
            vi.useFakeTimers();

            mockFetch.mockRejectedValue(new Error('Network error'));

            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            const payload: ChangePayload = {
                type: 'update',
                path: 'basics.name',
                value: 'Jane Doe',
                metadata: {
                    nodeId: 'basics-1',
                    sectionId: 'basics'
                },
                timestamp: new Date().toISOString(),
                source: 'form'
            };

            syncEngine.onChange('form', payload);

            vi.advanceTimersByTime(600);

            // Wait for async error handling
            await vi.runAllTimersAsync();

            expect(consoleSpy).toHaveBeenCalledWith(
                'Failed to persist state:',
                expect.any(Error)
            );

            consoleSpy.mockRestore();
            vi.useRealTimers();
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty state updates', () => {
            const emptyState: EnhancedResumeJSON = {
                ...mockResumeData,
                sections: []
            };

            const emptyEngine = new SyncEngine(emptyState, 'test-cv-1');
            expect(emptyEngine.getState().sections).toHaveLength(0);
        });

        it('should handle null/undefined values', () => {
            const stateWithNulls = {
                ...mockResumeData,
                basics: {
                    ...mockResumeData.basics,
                    image: null as any,
                    url: undefined as any
                }
            };

            const nullEngine = new SyncEngine(stateWithNulls, 'test-cv-1');
            expect(nullEngine.getState().basics.image).toBeNull();
            expect(nullEngine.getState().basics.url).toBeUndefined();
        });

        it('should handle deeply nested changes', () => {
            const payload: ChangePayload = {
                type: 'update',
                path: 'sections[0].items[0].highlights[0].text',
                value: 'Updated highlight',
                metadata: {
                    nodeId: 'highlight-1',
                    sectionId: 'section-1'
                },
                timestamp: new Date().toISOString(),
                source: 'form'
            };

            syncEngine.onChange('form', payload);
            const state = syncEngine.getState();
            expect(state.sections[0].items[0].highlights[0].text).toBe('Updated highlight');
        });
    });
});
