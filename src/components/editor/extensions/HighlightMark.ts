import { Mark, mergeAttributes } from '@tiptap/core';

export interface HighlightMarkOptions {
    HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        highlightMark: {
            setHighlight: (attributes?: { color?: string }) => ReturnType;
            toggleHighlight: (attributes?: { color?: string }) => ReturnType;
            unsetHighlight: () => ReturnType;
        };
    }
}

export const HighlightMark = Mark.create<HighlightMarkOptions>({
    name: 'highlightMark',

    addOptions() {
        return {
            HTMLAttributes: {},
        };
    },

    addAttributes() {
        return {
            color: {
                default: '#ffff00',
                parseHTML: element => element.getAttribute('data-color') || '#ffff00',
                renderHTML: attributes => {
                    return {
                        'data-color': attributes.color,
                        style: `background-color: ${attributes.color}`,
                    };
                },
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'mark[data-type="highlight"]',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            'mark',
            mergeAttributes(
                { 'data-type': 'highlight' },
                this.options.HTMLAttributes,
                HTMLAttributes
            ),
            0,
        ];
    },

    addCommands() {
        return {
            setHighlight:
                attributes =>
                    ({ commands }) => {
                        return commands.setMark(this.name, attributes);
                    },
            toggleHighlight:
                attributes =>
                    ({ commands }) => {
                        return commands.toggleMark(this.name, attributes);
                    },
            unsetHighlight:
                () =>
                    ({ commands }) => {
                        return commands.unsetMark(this.name);
                    },
        };
    },
});
