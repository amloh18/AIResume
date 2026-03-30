import { Node, mergeAttributes } from '@tiptap/core';

export interface SkillTagNodeOptions {
    HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        skillTagNode: {
            setSkillTagNode: (attributes: { id: string; name: string }) => ReturnType;
        };
    }
}

export const SkillTagNode = Node.create<SkillTagNodeOptions>({
    name: 'skillTagNode',

    group: 'inline',

    inline: true,

    content: 'text*',

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
            name: {
                default: '',
                parseHTML: element => element.textContent || '',
                renderHTML: attributes => {
                    return {};
                },
            },
            level: {
                default: '',
                parseHTML: element => element.getAttribute('data-level'),
                renderHTML: attributes => {
                    if (!attributes.level) {
                        return {};
                    }
                    return {
                        'data-level': attributes.level,
                    };
                },
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'span[data-type="skill-tag"]',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            'span',
            mergeAttributes(
                { 'data-type': 'skill-tag' },
                this.options.HTMLAttributes,
                HTMLAttributes
            ),
            0,
        ];
    },

    addCommands() {
        return {
            setSkillTagNode:
                attributes =>
                    ({ commands }) => {
                        return commands.insertContent({
                            type: this.name,
                            attrs: attributes,
                        });
                    },
        };
    },
});
