import { Node, mergeAttributes } from '@tiptap/core';

export interface EducationBlockOptions {
    HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        educationBlock: {
            setEducationBlock: (attributes: { id: string; institution: string; area: string }) => ReturnType;
        };
    }
}

export const EducationBlock = Node.create<EducationBlockOptions>({
    name: 'educationBlock',

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
            institution: {
                default: '',
                parseHTML: element => element.getAttribute('data-institution'),
                renderHTML: attributes => {
                    if (!attributes.institution) {
                        return {};
                    }
                    return {
                        'data-institution': attributes.institution,
                    };
                },
            },
            area: {
                default: '',
                parseHTML: element => element.getAttribute('data-area'),
                renderHTML: attributes => {
                    if (!attributes.area) {
                        return {};
                    }
                    return {
                        'data-area': attributes.area,
                    };
                },
            },
            studyType: {
                default: '',
                parseHTML: element => element.getAttribute('data-study-type'),
                renderHTML: attributes => {
                    if (!attributes.studyType) {
                        return {};
                    }
                    return {
                        'data-study-type': attributes.studyType,
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
            score: {
                default: '',
                parseHTML: element => element.getAttribute('data-score'),
                renderHTML: attributes => {
                    if (!attributes.score) {
                        return {};
                    }
                    return {
                        'data-score': attributes.score,
                    };
                },
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'div[data-type="education-block"]',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            'div',
            mergeAttributes(
                { 'data-type': 'education-block' },
                this.options.HTMLAttributes,
                HTMLAttributes
            ),
            0,
        ];
    },

    addCommands() {
        return {
            setEducationBlock:
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
