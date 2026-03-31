import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export interface DragDropOptions {
    onDragStart?: (event: DragEvent) => void;
    onDragEnd?: (event: DragEvent) => void;
    onDrop?: (event: DragEvent) => void;
    onReorder?: (fromIndex: number, toIndex: number) => void;
}

interface DragDropState {
    dragging: { pos: number; nodeType: string } | null;
    dropTarget: { pos: number; side: 'before' | 'after' } | null;
}

const dragDropKey = new PluginKey<DragDropState>('dragDrop');

export const DragDropPlugin = Extension.create<DragDropOptions>({
    name: 'dragDrop',

    addOptions() {
        return {
            onDragStart: undefined,
            onDragEnd: undefined,
            onDrop: undefined,
            onReorder: undefined,
        };
    },

    addProseMirrorPlugins() {
        const options = this.options;

        return [
            new Plugin({
                key: dragDropKey,
                state: {
                    init() {
                        return { dragging: null, dropTarget: null };
                    },
                    apply(tr, value) {
                        const meta = tr.getMeta(dragDropKey);
                        if (meta) return meta;
                        // Reset on doc changes
                        if (tr.docChanged) return { dragging: null, dropTarget: null };
                        return value;
                    },
                },
                props: {
                    handleDOMEvents: {
                        dragstart: (view, event) => {
                            if (options.onDragStart) {
                                options.onDragStart(event);
                            }

                            // Find which block is being dragged
                            const pos = view.posAtCoords({ left: event.clientX, top: event.clientY });
                            if (pos) {
                                const $pos = view.state.doc.resolve(pos.pos);
                                for (let d = $pos.depth; d > 0; d--) {
                                    const node = $pos.node(d);
                                    if (node.isBlock && node.type.name !== 'doc') {
                                        view.dispatch(
                                            view.state.tr.setMeta(dragDropKey, {
                                                dragging: { pos: $pos.before(d), nodeType: node.type.name },
                                                dropTarget: null,
                                            })
                                        );
                                        break;
                                    }
                                }
                            }
                            return false;
                        },
                        dragend: (view, event) => {
                            if (options.onDragEnd) {
                                options.onDragEnd(event);
                            }
                            view.dispatch(
                                view.state.tr.setMeta(dragDropKey, {
                                    dragging: null,
                                    dropTarget: null,
                                })
                            );
                            return false;
                        },
                        dragover: (view, event) => {
                            const pluginState = dragDropKey.getState(view.state);
                            if (!pluginState?.dragging) return false;

                            event.preventDefault();
                            if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';

                            const pos = view.posAtCoords({ left: event.clientX, top: event.clientY });
                            if (pos) {
                                const $pos = view.state.doc.resolve(pos.pos);
                                // Find the nearest block node
                                for (let d = $pos.depth; d > 0; d--) {
                                    const node = $pos.node(d);
                                    if (node.isBlock && node.type.name !== 'doc') {
                                        const blockPos = $pos.before(d);
                                        const blockEnd = $pos.after(d);
                                        const midPoint = (blockPos + blockEnd) / 2;
                                        const side: 'before' | 'after' = pos.pos < midPoint ? 'before' : 'after';

                                        if (blockPos !== pluginState.dragging.pos) {
                                            view.dispatch(
                                                view.state.tr.setMeta(dragDropKey, {
                                                    ...pluginState,
                                                    dropTarget: { pos: blockPos, side },
                                                })
                                            );
                                        }
                                        break;
                                    }
                                }
                            }
                            return false;
                        },
                        drop: (view, event) => {
                            const pluginState = dragDropKey.getState(view.state);
                            if (pluginState?.dragging && pluginState?.dropTarget) {
                                event.preventDefault();

                                const { pos: fromPos } = pluginState.dragging;
                                const { pos: toPos, side } = pluginState.dropTarget;

                                // Perform the move
                                const node = view.state.doc.nodeAt(fromPos);
                                if (node) {
                                    let insertPos = toPos;
                                    if (side === 'after') {
                                        const $toPos = view.state.doc.resolve(toPos);
                                        insertPos = toPos + $toPos.nodeAfter!.nodeSize;
                                    }

                                    // Delete from old position and insert at new
                                    let tr = view.state.tr.delete(fromPos, fromPos + node.nodeSize);
                                    
                                    // Adjust insert position if it's after the deleted position
                                    if (insertPos > fromPos) {
                                        insertPos -= node.nodeSize;
                                    }

                                    tr = tr.insert(insertPos, node);
                                    view.dispatch(tr);
                                }

                                if (options.onDrop) {
                                    options.onDrop(event);
                                }

                                view.dispatch(
                                    view.state.tr.setMeta(dragDropKey, {
                                        dragging: null,
                                        dropTarget: null,
                                    })
                                );
                                return true;
                            }
                            return false;
                        },
                    },
                    decorations(state) {
                        const pluginState = dragDropKey.getState(state);
                        const decorations: Decoration[] = [];

                        if (pluginState?.dropTarget) {
                            const { pos, side } = pluginState.dropTarget;
                            const widgetPos = side === 'before' ? pos : pos + state.doc.nodeAt(pos)!.nodeSize;

                            const decoration = Decoration.widget(widgetPos, () => {
                                const line = document.createElement('div');
                                line.className = 'drop-indicator-line';
                                line.style.cssText = `
                                    height: 3px;
                                    background: #84cc16;
                                    border-radius: 2px;
                                    margin: 2px 0;
                                    box-shadow: 0 0 6px rgba(132, 204, 22, 0.5);
                                    animation: dragDropPulse 1s ease-in-out infinite;
                                `;
                                return line;
                            });

                            decorations.push(decoration);
                        }

                        return DecorationSet.create(state.doc, decorations);
                    },
                },
            }),
        ];
    },
});
