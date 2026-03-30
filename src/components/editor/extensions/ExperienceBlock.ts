import { Node, mergeAttributes } from '@tiptap/core';

export interface ExperienceBlockOptions {
    HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        experienceBlock: {
            setExperienceBlock: (attributes: { id: string; company: string; position: string }) => ReturnType;
        };
    }
}

export const ExperienceBlock = Node.create<ExperienceBlockOptions>({
    name: 'experienceBlock',

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
            company: {
                default: '',
                parseHTML: element => element.getAttribute('data-company'),
                renderHTML: attributes => {
                    if (!attributes.company) {
                        return {};
                    }
                    return {
                        'data-company': attributes.company,
                    };
                },
            },
            position: {
                default: '',
                parseHTML: element => element.getAttribute('data-position'),
                renderHTML: attributes => {
                    if (!attributes.position) {
                        return {};
                    }
                    return {
                        'data-position': attributes.position,
                    };
                },
            },
            startDate: {
                default: '',
                parseHTML: element => element.getAttribute('data-start-date'),
                renderHTML: attributes => {
                    if (!attributes.startDate) {
                        return {};
                    }
                    return {
                        'data-start-date': attributes.startDate,
                    };
                },
            },
            endDate: {
                default: '',
                parseHTML: element => element.getAttribute('data-end-date'),
                renderHTML: attributes => {
                    if (!attributes.endDate) {
                        return {};
                    }
                    return {
                        'data-end-date': attributes.endDate,
                    };
                },
            },
            current: {
                default: false,
                parseHTML: element => element.getAttribute('data-current') === 'true',
                renderHTML: attributes => {
                    return {
                        'data-current': attributes.current ? 'true' : 'false',
                    };
                },
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'div[data-type="experience-block"]',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            'div',
            mergeAttributes(
                { 'data-type': 'experience-block' },
                this.options.HTMLAttributes,
                HTMLAttributes
            ),
            0,
        ];
    },

    addCommands() {
        return {
            setExperienceBlock:
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
