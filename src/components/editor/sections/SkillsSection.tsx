'use client';

import React from 'react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { GripVertical, Trash2, Plus } from 'lucide-react';

interface SkillsSectionProps {
    node: {
        attrs: {
            id: string;
            name: string;
            level: string;
            keywords: string[];
        };
    };
    updateAttributes: (attrs: Record<string, any>) => void;
    deleteNode: () => void;
    selected: boolean;
}

const SkillsSection: React.FC<SkillsSectionProps> = ({
    node,
    updateAttributes,
    deleteNode,
    selected,
}) => {
    const { id, name, level, keywords } = node.attrs;

    return (
        <NodeViewWrapper
            className={`skills-section my-4 p-4 border rounded-lg transition-all ${selected
                    ? 'border-lime-500 bg-lime-50 dark:bg-lime-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                }`}
            data-id={id}
            data-type="skills-block"
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
                                value={name}
                                onChange={e => updateAttributes({ name: e.target.value })}
                                placeholder="Skill Category"
                                className="w-full text-lg font-semibold bg-transparent border-none focus:outline-none focus:ring-0 text-gray-900 dark:text-white"
                            />
                            <input
                                type="text"
                                value={level}
                                onChange={e => updateAttributes({ level: e.target.value })}
                                placeholder="Proficiency Level (e.g., Expert, Advanced)"
                                className="w-full text-sm text-gray-600 dark:text-gray-400 bg-transparent border-none focus:outline-none focus:ring-0 mt-1"
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={deleteNode}
                                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                title="Delete skill category"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Keywords/Tags */}
                    <div className="flex flex-wrap gap-2 mb-3">
                        {keywords && keywords.length > 0 ? (
                            keywords.map((keyword, index) => (
                                <span
                                    key={index}
                                    className="px-2 py-1 text-sm bg-lime-100 dark:bg-lime-900/30 text-lime-700 dark:text-lime-300 rounded-full"
                                >
                                    {keyword}
                                </span>
                            ))
                        ) : (
                            <span className="text-sm text-gray-400">No skills added yet</span>
                        )}
                    </div>

                    {/* Skills Content */}
                    <div className="skills-content">
                        <NodeViewContent />
                    </div>

                    {/* Add Skill Button */}
                    <button
                        className="mt-2 flex items-center gap-1 text-sm text-lime-600 hover:text-lime-700 dark:text-lime-400 dark:hover:text-lime-300"
                        contentEditable={false}
                    >
                        <Plus size={14} />
                        Add skill
                    </button>
                </div>
            </div>
        </NodeViewWrapper>
    );
};

export default SkillsSection;
