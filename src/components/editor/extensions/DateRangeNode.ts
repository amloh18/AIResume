import { Node, mergeAttributes } from '@tiptap/core';

export interface DateRangeNodeOptions {
    HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        dateRangeNode: {
            setDateRangeNode: (attributes: { id: string; startDate: string; endDate: string }) => ReturnType;
        };
    }
}

export const DateRangeNode = Node.create<DateRangeNodeOptions>({
    name: 'dateRangeNode',

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
                tag: 'span[data-type="date-range"]',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            'span',
            mergeAttributes(
                { 'data-type': 'date-range' },
                this.options.HTMLAttributes,
                HTMLAttributes
            ),
            0,
        ];
    },

    addCommands() {
        return {
            setDateRangeNode:
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
