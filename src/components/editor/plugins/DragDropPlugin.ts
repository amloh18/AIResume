import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export interface DragDropOptions {
    onDragStart?: (event: DragEvent) => void;
    onDragEnd?: (event: DragEvent) => void;
    onDrop?: (event: DragEvent) => void;
}

export const DragDropPlugin = Extension.create<DragDropOptions>({
    name: 'dragDrop',

    addOptions() {
        return {
            onDragStart: undefined,
            onDragEnd: undefined,
            onDrop: undefined,
        };
    },

    addProseMirrorPlugins() {
        return [
            new Plugin({
                key: new PluginKey('dragDrop'),
                props: {
                    handleDOMEvents: {
                        dragstart: (view, event) => {
                            if (this.options.onDragStart) {
                                this.options.onDragStart(event);
                            }
                            return false;
                        },
                        dragend: (view, event) => {
                            if (this.options.onDragEnd) {
                                this.options.onDragEnd(event);
                            }
                            return false;
                        },
                        drop: (view, event) => {
                            if (this.options.onDrop) {
                                this.options.onDrop(event);
                            }
                            return false;
                        },
                    },
                    decorations(state) {
                        const decorations: Decoration[] = [];

                        // Add drag handle decorations to block nodes
                        state.doc.descendants((node, pos) => {
                            if (node.isBlock && node.type.name !== 'doc') {
                                const decoration = Decoration.widget(pos, () => {
                                    const handle = document.createElement('div');
                                    handle.className = 'drag-handle';
                                    handle.setAttribute('draggable', 'true');
                                    handle.innerHTML = '⋮⋮';
                                    handle.style.cssText = `
                    position: absolute;
                    left: -20px;
                    top: 50%;
                    transform: translateY(-50%);
                    cursor: grab;
                    color: #999;
                    font-size: 12px;
                    user-select: none;
                    opacity: 0.5;
                    transition: opacity 0.2s;
                  `;

                                    handle.addEventListener('mouseenter', () => {
                                        handle.style.opacity = '1';
                                    });

                                    handle.addEventListener('mouseleave', () => {
                                        handle.style.opacity = '0.5';
                                    });

                                    return handle;
                                });

                                decorations.push(decoration);
                            }
                        });

                        return DecorationSet.create(state.doc, decorations);
                    },
                },
            }),
        ];
    },
});
