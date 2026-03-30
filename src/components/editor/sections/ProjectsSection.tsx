'use client';

import React from 'react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { GripVertical, Trash2, Plus, ExternalLink } from 'lucide-react';

interface ProjectsSectionProps {
    node: {
        attrs: {
            id: string;
            name: string;
            description: string;
            url: string;
            startDate: string;
            endDate: string;
            highlights: string[];
        };
    };
    updateAttributes: (attrs: Record<string, any>) => void;
    deleteNode: () => void;
    selected: boolean;
}

const ProjectsSection: React.FC<ProjectsSectionProps> = ({
    node,
    updateAttributes,
    deleteNode,
    selected,
}) => {
    const { id, name, description, url, startDate, endDate, highlights } = node.attrs;

    return (
        <NodeViewWrapper
            className={`projects-section my-4 p-4 border rounded-lg transition-all ${selected
                    ? 'border-lime-500 bg-lime-50 dark:bg-lime-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                }`}
            data-id={id}
            data-type="projects-block"
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
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => updateAttributes({ name: e.target.value })}
                                    placeholder="Project Name"
                                    className="flex-1 text-lg font-semibold bg-transparent border-none focus:outline-none focus:ring-0 text-gray-900 dark:text-white"
                                />
                                {url && (
                                    <a
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-lime-600 hover:text-lime-700 dark:text-lime-400 dark:hover:text-lime-300"
                                    >
                                        <ExternalLink size={16} />
                                    </a>
                                )}
                            </div>
                            <input
                                type="text"
                                value={description}
                                onChange={e => updateAttributes({ description: e.target.value })}
                                placeholder="Brief description"
                                className="w-full text-sm text-gray-600 dark:text-gray-400 bg-transparent border-none focus:outline-none focus:ring-0 mt-1"
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={deleteNode}
                                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                title="Delete project"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>

                    {/* URL and Date Range */}
                    <div className="flex items-center gap-4 mb-3 text-sm text-gray-500 dark:text-gray-400">
                        <input
                            type="url"
                            value={url}
                            onChange={e => updateAttributes({ url: e.target.value })}
                            placeholder="Project URL"
                            className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0"
                        />
                        <div className="flex items-center gap-2">
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
                                className="w-24 bg-transparent border-none focus:outline-none focus:ring-0"
                            />
                        </div>
                    </div>

                    {/* Highlights */}
                    {highlights && highlights.length > 0 && (
                        <div className="mb-3">
                            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Highlights:
                            </div>
                            <ul className="list-disc list-inside space-y-1">
                                {highlights.map((highlight, index) => (
                                    <li key={index} className="text-sm text-gray-600 dark:text-gray-400">
                                        {highlight}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Project Content */}
                    <div className="projects-content">
                        <NodeViewContent />
                    </div>

                    {/* Add Highlight Button */}
                    <button
                        className="mt-2 flex items-center gap-1 text-sm text-lime-600 hover:text-lime-700 dark:text-lime-400 dark:hover:text-lime-300"
                        contentEditable={false}
                    >
                        <Plus size={14} />
                        Add highlight
                    </button>
                </div>
            </div>
        </NodeViewWrapper>
    );
};

export default ProjectsSection;
