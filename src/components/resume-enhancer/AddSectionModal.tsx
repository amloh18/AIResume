'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface AddSectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddSection: (sectionType: string) => void;
    existingSections: string[];
}

const AVAILABLE_SECTIONS = [
    { id: 'volunteer', label: 'Volunteer Experience', icon: '🤝', description: 'Add volunteer work and charity experience' },
    { id: 'publications', label: 'Publications', icon: '📚', description: 'Add published articles, papers, or books' },
    { id: 'languages', label: 'Languages', icon: '🌐', description: 'Add language proficiency' },
    { id: 'interests', label: 'Interests', icon: '⭐', description: 'Add hobbies and personal interests' },
    { id: 'references', label: 'References', icon: '📝', description: 'Add professional references' },
    { id: 'awards', label: 'Awards', icon: '🏆', description: 'Add awards and recognitions' },
    { id: 'certificates', label: 'Certificates', icon: '📜', description: 'Add professional certifications' },
    { id: 'projects', label: 'Projects', icon: '💼', description: 'Add personal or professional projects' },
];

export const AddSectionModal: React.FC<AddSectionModalProps> = ({
    isOpen,
    onClose,
    onAddSection,
    existingSections
}) => {
    if (!isOpen) return null;

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
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998] cv-editor-only"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: 'spring', duration: 0.3 }}
                        className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[9999] w-full max-w-2xl mx-4 cv-editor-only"
                    >
                        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
                            {/* Header */}
                            <div className="bg-gradient-to-r from-lime-500 to-lime-600 dark:from-lime-600 dark:to-lime-700 p-6 text-white">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-2xl font-bold">Add Section</h2>
                                        <p className="text-lime-100 text-sm mt-1">Choose a section to add to your CV</p>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-6 max-h-[60vh] overflow-y-auto">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {AVAILABLE_SECTIONS.map((section) => {
                                        const isAlreadyAdded = existingSections.includes(section.id);

                                        return (
                                            <motion.button
                                                key={section.id}
                                                onClick={() => {
                                                    if (!isAlreadyAdded) {
                                                        onAddSection(section.id);
                                                        onClose();
                                                    }
                                                }}
                                                disabled={isAlreadyAdded}
                                                whileHover={!isAlreadyAdded ? { scale: 1.02, y: -2 } : {}}
                                                whileTap={!isAlreadyAdded ? { scale: 0.98 } : {}}
                                                className={`relative p-4 rounded-xl text-left transition-all ${isAlreadyAdded
                                                        ? 'bg-gray-100 dark:bg-gray-800 opacity-50 cursor-not-allowed'
                                                        : 'bg-gray-50 dark:bg-gray-800 hover:bg-lime-50 dark:hover:bg-lime-900/20 hover:shadow-md border-2 border-transparent hover:border-lime-500'
                                                    }`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="text-3xl flex-shrink-0">{section.icon}</div>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
                                                            {section.label}
                                                        </h3>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                                                            {section.description}
                                                        </p>
                                                    </div>
                                                </div>
                                                {isAlreadyAdded && (
                                                    <div className="absolute top-2 right-2">
                                                        <span className="px-2 py-0.5 bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-full font-medium">
                                                            Added
                                                        </span>
                                                    </div>
                                                )}
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                                    Select a section to add it to your CV. Already added sections are disabled.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default AddSectionModal;
