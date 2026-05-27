// @ts-nocheck
import { Node, mergeAttributes } from '@tiptap/core';

export interface BulletListOptions {
    HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        bulletList: {
            setBulletList: () => ReturnType;
            toggleBulletList: () => ReturnType;
            unsetBulletList: () => ReturnType;
        };
    }
}

export const BulletList = Node.create<BulletListOptions>({
    name: 'bulletList',

    group: 'block',

    content: 'bulletNode+',

    defining: true,

    addOptions() {
        return {
            HTMLAttributes: {},
        };
    },

    parseHTML() {
        return [
            {
                tag: 'ul[data-type="bullet-list"]',
                priority: 100,
            },
            {
                tag: 'ul.bullet-list',
                priority: 90,
            },
            {
                tag: 'ul',
                priority: 50,
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            'ul',
            mergeAttributes(
                { 
                    class: 'bullet-list list-disc list-inside space-y-1 my-2',
                    'data-type': 'bullet-list'
                },
                this.options.HTMLAttributes,
                HTMLAttributes
            ),
            0,
        ];
    },

    addCommands() {
        return {
            setBulletList:
                () =>
                    ({ commands }) => {
                        return commands.wrap(this.name);
                    },
            toggleBulletList:
                () =>
                    ({ chain, range }) => {
                        return chain()
                            .toggleWrap(this.name)
                            .run();
                    },
            unsetBulletList:
                () =>
                    ({ commands }) => {
                        return commands.lift(this.name);
                    },
        };
    },
});

export default BulletList;