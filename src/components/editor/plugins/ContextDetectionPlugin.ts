import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

export interface ContextDetectionOptions {
    onContextChange?: (context: {
        sectionType: string | null;
        sectionId: string | null;
        itemId: string | null;
        fieldType: string | null;
    }) => void;
}

export const ContextDetectionPlugin = Extension.create<ContextDetectionOptions>({
    name: 'contextDetection',

    addOptions() {
        return {
            onContextChange: undefined,
        };
    },

    addProseMirrorPlugins() {
        const options = this.options;

        return [
            new Plugin({
                key: new PluginKey('contextDetection'),
                state: {
                    init() {
                        return {
                            sectionType: null as string | null,
                            sectionId: null as string | null,
                            itemId: null as string | null,
                            fieldType: null as string | null,
                        };
                    },
                    apply(tr, value) {
                        const meta = tr.getMeta('contextDetection');
                        if (meta) {
                            return meta;
                        }
                        return value;
                    },
                },
                view(editorView) {
                    const updateContext = () => {
                        const { state } = editorView;
                        const { selection } = state;
                        const { $from } = selection;

                        // Find the nearest block node with data-type attribute
                        let sectionType: string | null = null;
                        let sectionId: string | null = null;
                        let itemId: string | null = null;
                        let fieldType: string | null = null;

                        // Walk up the tree to find section context
                        for (let d = $from.depth; d > 0; d--) {
                            const node = $from.node(d);

                            // Check for section blocks
                            if (node.attrs['data-type']) {
                                const dataType = node.attrs['data-type'];

                                if (dataType === 'experience-block') {
                                    sectionType = 'experience';
                                    sectionId = node.attrs['data-id'];
                                    itemId = node.attrs['data-id'];
                                } else if (dataType === 'education-block') {
                                    sectionType = 'education';
                                    sectionId = node.attrs['data-id'];
                                    itemId = node.attrs['data-id'];
                                } else if (dataType === 'skills-block') {
                                    sectionType = 'skills';
                                    sectionId = node.attrs['data-id'];
                                    itemId = node.attrs['data-id'];
                                } else if (dataType === 'projects-block') {
                                    sectionType = 'projects';
                                    sectionId = node.attrs['data-id'];
                                    itemId = node.attrs['data-id'];
                                }
                            }

                            // Check for bullet nodes
                            if (node.type.name === 'bulletNode') {
                                fieldType = 'bullet';
                                itemId = node.attrs['data-id'];
                            }

                            // Check for skill tags
                            if (node.type.name === 'skillTagNode') {
                                fieldType = 'skill';
                                itemId = node.attrs['data-id'];
                            }

                            // Check for date ranges
                            if (node.type.name === 'dateRangeNode') {
                                fieldType = 'date';
                                itemId = node.attrs['data-id'];
                            }
                        }

                        // Update context if changed
                        const currentState = this.getState(editorView.state);
                        if (
                            currentState.sectionType !== sectionType ||
                            currentState.sectionId !== sectionId ||
                            currentState.itemId !== itemId ||
                            currentState.fieldType !== fieldType
                        ) {
                            editorView.dispatch(
                                editorView.state.tr.setMeta('contextDetection', {
                                    sectionType,
                                    sectionId,
                                    itemId,
                                    fieldType,
                                })
                            );

                            if (options.onContextChange) {
                                options.onContextChange({
                                    sectionType,
                                    sectionId,
                                    itemId,
                                    fieldType,
                                });
                            }
                        }
                    };

                    // Update context on selection change
                    return {
                        update(view, prevState) {
                            if (!prevState.doc.eq(view.state.doc) || !prevState.selection.eq(view.state.selection)) {
                                updateContext();
                            }
                        },
                    };
                },
            }),
        ];
    },
});
