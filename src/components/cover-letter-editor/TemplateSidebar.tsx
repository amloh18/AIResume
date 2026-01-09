'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { CoverLetterTemplate } from '@/lib/templates/cover-letter-templates';
import CoverLetterTemplateContent from './CoverLetterTemplateContent';

interface TemplateSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    selectedTemplate: CoverLetterTemplate | null | undefined;
    onTemplateSelect: (template: CoverLetterTemplate) => void;
}

export default function TemplateSidebar({
    isOpen,
    onClose,
    selectedTemplate,
    onTemplateSelect
}: TemplateSidebarProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
                    />

                    {/* Sidebar */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 bottom-0 w-[45vw] bg-white dark:bg-[#141810] shadow-2xl z-50 border-l border-gray-200 dark:border-gray-800 flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Choose Template</h2>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-[#1a230f] rounded-lg transition-colors text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            <CoverLetterTemplateContent
                                selectedTemplate={selectedTemplate}
                                onTemplateSelect={(template) => {
                                    onTemplateSelect(template);
                                    // Optional: Close on select? User might want to browse.
                                    // onClose(); 
                                }}
                            />
                        </div>

                        <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#1a230f]">
                            <button
                                onClick={onClose}
                                className="w-full py-3 bg-lime-500 hover:bg-lime-600 dark:bg-[#99FF00] dark:hover:bg-[#88e600] text-black font-semibold rounded-xl transition-colors"
                            >
                                Done
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
