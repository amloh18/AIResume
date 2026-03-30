import { Node, mergeAttributes } from '@tiptap/core';

export interface BulletNodeOptions {
    HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        bulletNode: {
            setBulletNode: (attributes: { id: string; text: string }) => ReturnType;
            toggleBulletList: () => ReturnType;
        };
    }
}

export const BulletNode = Node.create<BulletNodeOptions>({
    name: 'bulletNode',

    group: 'block',

    content: 'text*',

    defining: true,

    addOptions() {
        return {
            HTMLAttributes: {},
        };
    },

    addAttributes() {
        return {
            id: {
                default: null,
                parseHTML: element => element.getAttribute('data-id'),
                renderHTML: attributes => {
                    if (!attributes.id) {
                        return {};
                    }
                    return {
                        'data-id': attributes.id,
                    };
                },
            },
            text: {
                default: '',
                parseHTML: element => element.textContent || '',
                renderHTML: attributes => {
                    return {};
                },
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'li[data-type="bullet-node"]',
            },
            {
                tag: 'li.bullet-item',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            'li',
            mergeAttributes(
                { 
                    'data-type': 'bullet-node',
                    class: 'bullet-item list-disc list-inside marker:text-[var(--accent-primary)] ml-4'
                },
                this.options.HTMLAttributes,
                HTMLAttributes
            ),
            0,
        ];
    },

    addCommands() {
        return {
            setBulletNode:
                attributes =>
                    ({ commands }) => {
                        return commands.insertContent({
                            type: this.name,
                            attrs: attributes,
                        });
                    },
            toggleBulletList:
                () =>
                    ({ chain, can }) => {
                        if (can().toggleWrap('bulletList')) {
                            return chain().toggleWrap('bulletList').run();
                        }
                        return chain().toggleWrap('bulletList').run();
                    },
        };
    },
});
