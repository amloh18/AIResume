'use client';

import React from 'react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { GripVertical, Trash2, Plus } from 'lucide-react';

interface ExperienceSectionProps {
    node: {
        attrs: {
            id: string;
            company: string;
            position: string;
            startDate: string;
            endDate: string;
            current: boolean;
        };
    };
    updateAttributes: (attrs: Record<string, any>) => void;
    deleteNode: () => void;
    selected: boolean;
}

const ExperienceSection: React.FC<ExperienceSectionProps> = ({
    node,
    updateAttributes,
    deleteNode,
    selected,
}) => {
    const { id, company, position, startDate, endDate, current } = node.attrs;

    return (
        <NodeViewWrapper
            className={`experience-section my-4 p-4 border rounded-lg transition-all ${selected
                    ? 'border-lime-500 bg-lime-50 dark:bg-lime-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                }`}
            data-id={id}
            data-type="experience-block"
        >
            {/* Drag Handle */}
            <div className="flex items-start gap-3">
                <div
                    className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 mt-1"
                    contentEditable={false}
                >
                    <GripVertical size={20} />
                </div>

                {/* Content */}
                <div className="flex-1">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex-1">
                            <input
                                type="text"
                                value={company}
                                onChange={e => updateAttributes({ company: e.target.value })}
                                placeholder="Company Name"
                                className="w-full text-lg font-semibold bg-transparent border-none focus:outline-none focus:ring-0 text-gray-900 dark:text-white"
                            />
                            <input
                                type="text"
                                value={position}
                                onChange={e => updateAttributes({ position: e.target.value })}
                                placeholder="Position Title"
                                className="w-full text-sm text-gray-600 dark:text-gray-400 bg-transparent border-none focus:outline-none focus:ring-0 mt-1"
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={deleteNode}
                                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                title="Delete experience"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Date Range */}
                    <div className="flex items-center gap-2 mb-3 text-sm text-gray-500 dark:text-gray-400">
                        <input
                            type="text"
                            value={startDate}
                            onChange={e => updateAttributes({ startDate: e.target.value })}
                            placeholder="Start Date"
                            className="w-24 bg-transparent border-none focus:outline-none focus:ring-0"
                        />
                        <span>-</span>
                        <input
                            type="text"
                            value={endDate}
                            onChange={e => updateAttributes({ endDate: e.target.value })}
                            placeholder="End Date"
                            disabled={current}
                            className="w-24 bg-transparent border-none focus:outline-none focus:ring-0 disabled:opacity-50"
                        />
                        <label className="flex items-center gap-1 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={current}
                                onChange={e => updateAttributes({ current: e.target.checked })}
                                className="rounded border-gray-300 text-lime-600 focus:ring-lime-500"
                            />
                            <span className="text-xs">Current</span>
                        </label>
                    </div>

                    {/* Bullet Points */}
                    <div className="experience-content">
                        <NodeViewContent />
                    </div>

                    {/* Add Bullet Button */}
                    <button
                        className="mt-2 flex items-center gap-1 text-sm text-lime-600 hover:text-lime-700 dark:text-lime-400 dark:hover:text-lime-300"
                        contentEditable={false}
                    >
                        <Plus size={14} />
                        Add bullet point
                    </button>
                </div>
            </div>
        </NodeViewWrapper>
    );
};

export default ExperienceSection;
