import { Node, mergeAttributes } from '@tiptap/core';

export interface SkillsBlockOptions {
    HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        skillsBlock: {
            setSkillsBlock: (attributes: { id: string; name: string }) => ReturnType;
        };
    }
}

export const SkillsBlock = Node.create<SkillsBlockOptions>({
    name: 'skillsBlock',

    group: 'block',

    content: 'block+',

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
            name: {
                default: '',
                parseHTML: element => element.getAttribute('data-name'),
                renderHTML: attributes => {
                    if (!attributes.name) {
                        return {};
                    }
                    return {
                        'data-name': attributes.name,
                    };
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
            keywords: {
                default: [],
                parseHTML: element => {
                    const keywords = element.getAttribute('data-keywords');
                    return keywords ? keywords.split(',') : [];
                },
                renderHTML: attributes => {
                    if (!attributes.keywords || attributes.keywords.length === 0) {
                        return {};
                    }
                    return {
                        'data-keywords': attributes.keywords.join(','),
                    };
                },
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'div[data-type="skills-block"]',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            'div',
            mergeAttributes(
                { 'data-type': 'skills-block' },
                this.options.HTMLAttributes,
                HTMLAttributes
            ),
            0,
        ];
    },

    addCommands() {
        return {
            setSkillsBlock:
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
