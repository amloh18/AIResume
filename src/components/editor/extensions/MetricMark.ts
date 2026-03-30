import { Mark, mergeAttributes } from '@tiptap/core';

export interface MetricMarkOptions {
    HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        metricMark: {
            setMetric: (attributes?: { value?: string; unit?: string }) => ReturnType;
            toggleMetric: (attributes?: { value?: string; unit?: string }) => ReturnType;
            unsetMetric: () => ReturnType;
        };
    }
}

export const MetricMark = Mark.create<MetricMarkOptions>({
    name: 'metricMark',

    addOptions() {
        return {
            HTMLAttributes: {},
        };
    },

    addAttributes() {
        return {
            value: {
                default: '',
                parseHTML: element => element.getAttribute('data-value') || '',
                renderHTML: attributes => {
                    if (!attributes.value) {
                        return {};
                    }
                    return {
                        'data-value': attributes.value,
                    };
                },
            },
            unit: {
                default: '',
                parseHTML: element => element.getAttribute('data-unit') || '',
                renderHTML: attributes => {
                    if (!attributes.unit) {
                        return {};
                    }
                    return {
                        'data-unit': attributes.unit,
                    };
                },
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'span[data-type="metric"]',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            'span',
            mergeAttributes(
                { 'data-type': 'metric' },
                this.options.HTMLAttributes,
                HTMLAttributes
            ),
            0,
        ];
    },

    addCommands() {
        return {
            setMetric:
                attributes =>
                    ({ commands }) => {
                        return commands.setMark(this.name, attributes);
                    },
            toggleMetric:
                attributes =>
                    ({ commands }) => {
                        return commands.toggleMark(this.name, attributes);
                    },
            unsetMetric:
                () =>
                    ({ commands }) => {
                        return commands.unsetMark(this.name);
                    },
        };
    },
});
