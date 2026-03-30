import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export interface AISuggestionOptions {
    onSuggestion?: (text: string, context: any) => void;
    onAccept?: (suggestion: string) => void;
    onDismiss?: () => void;
}

export const AISuggestionPlugin = Extension.create<AISuggestionOptions>({
    name: 'aiSuggestion',

    addOptions() {
        return {
            onSuggestion: undefined,
            onAccept: undefined,
            onDismiss: undefined,
        };
    },

    addProseMirrorPlugins() {
        const options = this.options;

        return [
            new Plugin({
                key: new PluginKey('aiSuggestion'),
                state: {
                    init() {
                        return {
                            suggestion: null as string | null,
                            position: null as { from: number; to: number } | null,
                        };
                    },
                    apply(tr, value) {
                        const meta = tr.getMeta('aiSuggestion');
                        if (meta) {
                            return meta;
                        }
                        return value;
                    },
                },
                props: {
                    decorations(state) {
                        const pluginState = this.getState(state) as { suggestion: string | null; position: { from: number; to: number } | null };

                        if (!pluginState?.suggestion || !pluginState?.position) {
                            return DecorationSet.empty;
                        }

                        const decoration = Decoration.inline(pluginState.position.from, pluginState.position.to, {
                            class: 'ai-suggestion',
                            nodeName: 'span',
                            style: 'background-color: rgba(128, 255, 0, 0.2); border-bottom: 2px solid #80ff00;',
                        });

                        return DecorationSet.create(state.doc, [decoration]);
                    },
                    handleKeyDown(view, event) {
                        const pluginState = this.getState(view.state) as { suggestion: string | null; position: { from: number; to: number } | null };

                        if (!pluginState?.suggestion) {
                            return false;
                        }

                        // Tab to accept suggestion
                        if (event.key === 'Tab') {
                            event.preventDefault();
                            if (options.onAccept) {
                                options.onAccept(pluginState.suggestion);
                            }
                            return true;
                        }

                        // Escape to dismiss
                        if (event.key === 'Escape') {
                            event.preventDefault();
                            if (options.onDismiss) {
                                options.onDismiss();
                            }
                            return true;
                        }

                        return false;
                    },
                },
            }),
        ];
    },

    addCommands() {
        return {
            showAISuggestion:
                (suggestion: string, context: any) =>
                    ({ tr, dispatch }: { tr: any; dispatch: any }) => {
                        if (dispatch) {
                            const { from, to } = tr.selection;
                            tr.setMeta('aiSuggestion', {
                                suggestion,
                                position: { from, to },
                            });

                            if (this.options.onSuggestion) {
                                this.options.onSuggestion(suggestion, context);
                            }
                        }
                        return true;
                    },
            acceptAISuggestion:
                () =>
                    ({ tr, dispatch }: { tr: any; dispatch: any }) => {
                        if (dispatch) {
                            tr.setMeta('aiSuggestion', {
                                suggestion: null,
                                position: null,
                            });
                        }
                        return true;
                    },
            dismissAISuggestion:
                () =>
                    ({ tr, dispatch }: { tr: any; dispatch: any }) => {
                        if (dispatch) {
                            tr.setMeta('aiSuggestion', {
                                suggestion: null,
                                position: null,
                            });
                        }
                        return true;
                    },
        } as any;
    },
});
