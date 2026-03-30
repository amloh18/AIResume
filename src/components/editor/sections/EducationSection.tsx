'use client';

import React from 'react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { GripVertical, Trash2, Plus } from 'lucide-react';

interface EducationSectionProps {
    node: {
        attrs: {
            id: string;
            institution: string;
            area: string;
            studyType: string;
            startDate: string;
            endDate: string;
            score: string;
        };
    };
    updateAttributes: (attrs: Record<string, any>) => void;
    deleteNode: () => void;
    selected: boolean;
}

const EducationSection: React.FC<EducationSectionProps> = ({
    node,
    updateAttributes,
    deleteNode,
    selected,
}) => {
    const { id, institution, area, studyType, startDate, endDate, score } = node.attrs;

    return (
        <NodeViewWrapper
            className={`education-section my-4 p-4 border rounded-lg transition-all ${selected
                    ? 'border-lime-500 bg-lime-50 dark:bg-lime-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                }`}
            data-id={id}
            data-type="education-block"
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
                                value={institution}
                                onChange={e => updateAttributes({ institution: e.target.value })}
                                placeholder="Institution Name"
                                className="w-full text-lg font-semibold bg-transparent border-none focus:outline-none focus:ring-0 text-gray-900 dark:text-white"
                            />
                            <div className="flex items-center gap-2 mt-1">
                                <input
                                    type="text"
                                    value={area}
                                    onChange={e => updateAttributes({ area: e.target.value })}
                                    placeholder="Field of Study"
                                    className="flex-1 text-sm text-gray-600 dark:text-gray-400 bg-transparent border-none focus:outline-none focus:ring-0"
                                />
                                <input
                                    type="text"
                                    value={studyType}
                                    onChange={e => updateAttributes({ studyType: e.target.value })}
                                    placeholder="Degree Type"
                                    className="w-24 text-sm text-gray-600 dark:text-gray-400 bg-transparent border-none focus:outline-none focus:ring-0"
                                />
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={deleteNode}
                                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                title="Delete education"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Date Range and Score */}
                    <div className="flex items-center gap-4 mb-3 text-sm text-gray-500 dark:text-gray-400">
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
                        <div className="flex items-center gap-1">
                            <span>GPA:</span>
                            <input
                                type="text"
                                value={score}
                                onChange={e => updateAttributes({ score: e.target.value })}
                                placeholder="Score"
                                className="w-16 bg-transparent border-none focus:outline-none focus:ring-0"
                            />
                        </div>
                    </div>

                    {/* Courses/Details */}
                    <div className="education-content">
                        <NodeViewContent />
                    </div>

                    {/* Add Course Button */}
                    <button
                        className="mt-2 flex items-center gap-1 text-sm text-lime-600 hover:text-lime-700 dark:text-lime-400 dark:hover:text-lime-300"
                        contentEditable={false}
                    >
                        <Plus size={14} />
                        Add course or detail
                    </button>
                </div>
            </div>
        </NodeViewWrapper>
    );
};

export default EducationSection;
