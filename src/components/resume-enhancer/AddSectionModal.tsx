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
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ duration: 0.3 }}
                        className="relative w-full max-w-2xl bg-[var(--modal-bg)] rounded-2xl shadow-2xl shadow-black/30 dark:shadow-black/60 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-6 shadow-sm shadow-black/10 dark:shadow-black/30">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h2 className="text-2xl font-bold text-[color:var(--text-primary)] mb-2">Add Section</h2>
                                    <p className="text-[color:var(--text-secondary)] text-sm">
                                        Choose a section to add to your CV
                                    </p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <X className="h-5 w-5 text-[color:var(--text-secondary)]" />
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
                                                ? 'bg-black/5 dark:bg-white/5 opacity-50 cursor-not-allowed'
                                                : 'bg-[var(--bg-tertiary)] hover:bg-[color:var(--accent-primary)]/10 hover:shadow-md border-2 border-transparent hover:border-[color:var(--accent-primary)]'
                                                }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="text-3xl flex-shrink-0">{section.icon}</div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-semibold text-[color:var(--text-primary)] text-sm mb-1">
                                                        {section.label}
                                                    </h3>
                                                    <p className="text-xs text-[color:var(--text-tertiary)] line-clamp-2">
                                                        {section.description}
                                                    </p>
                                                </div>
                                            </div>
                                            {isAlreadyAdded && (
                                                <div className="absolute top-2 right-2">
                                                    <span className="px-2 py-0.5 bg-black/10 dark:bg-white/10 text-[color:var(--text-secondary)] text-xs rounded-full font-medium">
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
                        <div className="p-6 bg-[var(--bg-tertiary)] border-t border-[color:var(--border-secondary)]">
                            <p className="text-xs text-[color:var(--text-tertiary)] text-center">
                                Select a section to add it to your CV. Already added sections are disabled.
                            </p>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default AddSectionModal;
