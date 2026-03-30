import { Extension } from '@tiptap/core';

export interface KeyboardShortcutsOptions {
    onSave?: () => void;
    onUndo?: () => void;
    onRedo?: () => void;
    onBold?: () => void;
    onItalic?: () => void;
    onUnderline?: () => void;
    onAddBullet?: () => void;
    onAddSection?: () => void;
}

export const KeyboardShortcutsPlugin = Extension.create<KeyboardShortcutsOptions>({
    name: 'keyboardShortcuts',

    addOptions() {
        return {
            onSave: undefined,
            onUndo: undefined,
            onRedo: undefined,
            onBold: undefined,
            onItalic: undefined,
            onUnderline: undefined,
            onAddBullet: undefined,
            onAddSection: undefined,
        };
    },

    addKeyboardShortcuts() {
        return {
            'Mod-s': () => {
                if (this.options.onSave) {
                    this.options.onSave();
                    return true;
                }
                return false;
            },
            'Mod-z': () => {
                if (this.options.onUndo) {
                    this.options.onUndo();
                    return true;
                }
                return false;
            },
            'Mod-shift-z': () => {
                if (this.options.onRedo) {
                    this.options.onRedo();
                    return true;
                }
                return false;
            },
            'Mod-b': () => {
                if (this.options.onBold) {
                    this.options.onBold();
                    return true;
                }
                return false;
            },
            'Mod-i': () => {
                if (this.options.onItalic) {
                    this.options.onItalic();
                    return true;
                }
                return false;
            },
            'Mod-u': () => {
                if (this.options.onUnderline) {
                    this.options.onUnderline();
                    return true;
                }
                return false;
            },
            'Enter': () => {
                const { editor } = this;
                const { selection } = editor.state;
                const { $from } = selection;
                
                // Check if we're inside a bullet node or bullet list
                const isInBullet = $from.parent.type.name === 'bulletNode';
                const isInBulletList = $from.parent.type.name === 'bulletList';
                
                if (isInBullet || isInBulletList) {
                    // Insert a new bullet node
                    editor.chain().focus().insertContent({
                        type: 'bulletNode',
                        attrs: {
                            id: `bullet_${Date.now()}`,
                        },
                    }).run();
                    return true;
                }
                
                if (this.options.onAddBullet) {
                    this.options.onAddBullet();
                    return true;
                }
                return false;
            },
            'Mod-Enter': () => {
                if (this.options.onAddSection) {
                    this.options.onAddSection();
                    return true;
                }
                return false;
            },
            'Tab': () => {
                const { editor } = this;
                const { selection } = editor.state;
                const { $from } = selection;
                
                // Check if we're in a bullet - indent it
                if ($from.parent.type.name === 'bulletNode') {
                    // Create an indented sub-bullet
                    editor.chain().focus().insertContent({
                        type: 'bulletNode',
                        attrs: {
                            id: `bullet_${Date.now()}`,
                        },
                    }).run();
                    return true;
                }
                return false;
            },
        };
    },
});
