import { Node, mergeAttributes } from '@tiptap/core';

export interface ProjectsBlockOptions {
    HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        projectsBlock: {
            setProjectsBlock: (attributes: { id: string; name: string }) => ReturnType;
        };
    }
}

export const ProjectsBlock = Node.create<ProjectsBlockOptions>({
    name: 'projectsBlock',

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
            description: {
                default: '',
                parseHTML: element => element.getAttribute('data-description'),
                renderHTML: attributes => {
                    if (!attributes.description) {
                        return {};
                    }
                    return {
                        'data-description': attributes.description,
                    };
                },
            },
            url: {
                default: '',
                parseHTML: element => element.getAttribute('data-url'),
                renderHTML: attributes => {
                    if (!attributes.url) {
                        return {};
                    }
                    return {
                        'data-url': attributes.url,
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
            highlights: {
                default: [],
                parseHTML: element => {
                    const highlights = element.getAttribute('data-highlights');
                    return highlights ? highlights.split('|||') : [];
                },
                renderHTML: attributes => {
                    if (!attributes.highlights || attributes.highlights.length === 0) {
                        return {};
                    }
                    return {
                        'data-highlights': attributes.highlights.join('|||'),
                    };
                },
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'div[data-type="projects-block"]',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            'div',
            mergeAttributes(
                { 'data-type': 'projects-block' },
                this.options.HTMLAttributes,
                HTMLAttributes
            ),
            0,
        ];
    },

    addCommands() {
        return {
            setProjectsBlock:
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
