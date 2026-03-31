'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, GripVertical } from 'lucide-react';

interface SnippetPreview {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  isSection?: boolean;
  columnSupport?: 'single' | 'double' | 'both';
}

interface SectionGroup {
  id: string;
  label: string;
  icon: string;
  description: string;
  snippets: SnippetPreview[];
}

interface AddSectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddSection: (sectionType: string, snippetId?: string) => void;
    existingSections: string[];
}

const SECTION_GROUPS: SectionGroup[] = [
  {
    id: 'experience',
    label: 'Work Experience',
    icon: '💼',
    description: 'Add your professional work history',
    snippets: [
      { id: 'exp-standard', name: 'Standard', description: 'Company, position, dates, bullet points', icon: '💼', category: 'experience', isSection: true, columnSupport: 'both' },
      { id: 'exp-compact', name: 'Compact', description: 'Minimal layout with inline dates', icon: '📋', category: 'experience', isSection: true, columnSupport: 'both' },
      { id: 'exp-detailed', name: 'Detailed', description: 'Extended layout with highlights', icon: '📊', category: 'experience', isSection: true, columnSupport: 'single' },
    ],
  },
  {
    id: 'education',
    label: 'Education',
    icon: '🎓',
    description: 'Add your educational background',
    snippets: [
      { id: 'edu-standard', name: 'Standard', description: 'Institution, degree, dates, achievements', icon: '🎓', category: 'education', isSection: true, columnSupport: 'both' },
      { id: 'edu-compact', name: 'Compact', description: 'Minimal layout for experienced professionals', icon: '📚', category: 'education', isSection: true, columnSupport: 'both' },
      { id: 'edu-academic', name: 'Academic', description: 'Extended layout with thesis and publications', icon: '🏫', category: 'education', isSection: true, columnSupport: 'single' },
    ],
  },
  {
    id: 'skills',
    label: 'Skills',
    icon: '⚡',
    description: 'Showcase your technical and soft skills',
    snippets: [
      { id: 'skills-categories', name: 'Categories', description: 'Grouped by category with skill lists', icon: '⚡', category: 'skills', isSection: true, columnSupport: 'both' },
      { id: 'skills-tags', name: 'Tags', description: 'Pill-shaped tags for modern layouts', icon: '🏷️', category: 'skills', isSection: true, columnSupport: 'both' },
      { id: 'skills-bars', name: 'Progress Bars', description: 'Visual progress bars for proficiency', icon: '📶', category: 'skills', isSection: true, columnSupport: 'double' },
      { id: 'skills-grid', name: 'Grid', description: 'Multi-column grid layout', icon: '🔲', category: 'skills', isSection: true, columnSupport: 'both' },
    ],
  },
  {
    id: 'projects',
    label: 'Projects',
    icon: '🚀',
    description: 'Highlight your personal or professional projects',
    snippets: [
      { id: 'proj-standard', name: 'Standard', description: 'Project name, description, technologies', icon: '🚀', category: 'projects', isSection: true, columnSupport: 'both' },
      { id: 'proj-portfolio', name: 'Portfolio', description: 'Extended layout with links and images', icon: '🎨', category: 'projects', isSection: true, columnSupport: 'single' },
    ],
  },
  {
    id: 'volunteer',
    label: 'Volunteer Experience',
    icon: '🤝',
    description: 'Add volunteer work and charity experience',
    snippets: [
      { id: 'vol-standard', name: 'Standard', description: 'Organization, role, impact', icon: '🤝', category: 'other', isSection: true, columnSupport: 'both' },
    ],
  },
  {
    id: 'certificates',
    label: 'Certificates',
    icon: '📜',
    description: 'Add professional certifications',
    snippets: [
      { id: 'cert-standard', name: 'Standard', description: 'Name, issuer, date, credential ID', icon: '📜', category: 'other', isSection: true, columnSupport: 'both' },
    ],
  },
  {
    id: 'languages',
    label: 'Languages',
    icon: '🌐',
    description: 'Add language proficiency',
    snippets: [
      { id: 'lang-standard', name: 'Standard', description: 'Language with fluency level', icon: '🌐', category: 'other', isSection: true, columnSupport: 'both' },
    ],
  },
  {
    id: 'awards',
    label: 'Awards',
    icon: '🏆',
    description: 'Add awards and recognitions',
    snippets: [
      { id: 'awards-standard', name: 'Standard', description: 'Award name, issuer, date', icon: '🏆', category: 'other', isSection: true, columnSupport: 'both' },
    ],
  },
  {
    id: 'publications',
    label: 'Publications',
    icon: '📚',
    description: 'Add published articles, papers, or books',
    snippets: [
      { id: 'pub-standard', name: 'Standard', description: 'Title, publisher, date, link', icon: '📚', category: 'other', isSection: true, columnSupport: 'both' },
    ],
  },
  {
    id: 'references',
    label: 'References',
    icon: '📝',
    description: 'Add professional references',
    snippets: [
      { id: 'ref-standard', name: 'Standard', description: 'Name, company, contact info', icon: '📝', category: 'other', isSection: true, columnSupport: 'both' },
    ],
  },
  {
    id: 'interests',
    label: 'Interests',
    icon: '⭐',
    description: 'Add hobbies and personal interests',
    snippets: [
      { id: 'int-standard', name: 'Standard', description: 'List of interests and hobbies', icon: '⭐', category: 'other', isSection: true, columnSupport: 'both' },
    ],
  },
];

export const AddSectionModal: React.FC<AddSectionModalProps> = ({
    isOpen,
    onClose,
    onAddSection,
    existingSections
}) => {
    const [expandedSection, setExpandedSection] = useState<string | null>(null);

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
                        className="relative w-full max-w-3xl bg-[var(--modal-bg)] rounded-2xl shadow-2xl shadow-black/30 dark:shadow-black/60 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-6 shadow-sm shadow-black/10 dark:shadow-black/30">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h2 className="text-2xl font-bold text-[color:var(--text-primary)] mb-2">Add Section</h2>
                                    <p className="text-[color:var(--text-secondary)] text-sm">
                                        Choose a section type and layout style to add to your CV
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
                        <div className="p-6 max-h-[65vh] overflow-y-auto">
                            <div className="space-y-3">
                                {SECTION_GROUPS.map((group) => {
                                    const isAlreadyAdded = existingSections.includes(group.id);
                                    const isExpanded = expandedSection === group.id;

                                    return (
                                        <div key={group.id} className="rounded-xl border border-[color:var(--border-secondary)] overflow-hidden">
                                            {/* Section header - clickable to expand */}
                                            <button
                                                onClick={() => {
                                                    if (isAlreadyAdded) return;
                                                    setExpandedSection(isExpanded ? null : group.id);
                                                }}
                                                disabled={isAlreadyAdded}
                                                className={`w-full p-4 text-left transition-all duration-200 flex items-center gap-4 ${
                                                    isAlreadyAdded
                                                        ? 'bg-black/5 dark:bg-white/5 opacity-50 cursor-not-allowed'
                                                        : 'hover:bg-[color:var(--accent-primary)]/5 cursor-pointer'
                                                }`}
                                            >
                                                {/* Icon */}
                                                <div className="text-3xl flex-shrink-0">{group.icon}</div>
                                                
                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-semibold text-[color:var(--text-primary)] text-sm mb-0.5">
                                                        {group.label}
                                                    </h3>
                                                    <p className="text-xs text-[color:var(--text-tertiary)]">
                                                        {group.description}
                                                    </p>
                                                </div>

                                                {/* Snippet count / Added badge */}
                                                <div className="flex items-center gap-2">
                                                    {isAlreadyAdded ? (
                                                        <span className="px-2 py-0.5 bg-black/10 dark:bg-white/10 text-[color:var(--text-secondary)] text-xs rounded-full font-medium">
                                                            Added
                                                        </span>
                                                    ) : (
                                                        <>
                                                            <span className="text-xs text-[color:var(--text-tertiary)]">
                                                                {group.snippets.length} styles
                                                            </span>
                                                            <ChevronRight 
                                                                size={16} 
                                                                className={`text-[color:var(--text-tertiary)] transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                                            />
                                                        </>
                                                    )}
                                                </div>
                                            </button>

                                            {/* Expanded snippet options */}
                                            <AnimatePresence>
                                                {isExpanded && !isAlreadyAdded && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        transition={{ duration: 0.2 }}
                                                        className="overflow-hidden"
                                                    >
                                                        <div className="p-4 pt-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                                            {group.snippets.map((snippet) => (
                                                                <motion.button
                                                                    key={snippet.id}
                                                                    onClick={() => {
                                                                        onAddSection(group.id, snippet.id);
                                                                        onClose();
                                                                    }}
                                                                    whileHover={{ scale: 1.02, y: -1 }}
                                                                    whileTap={{ scale: 0.98 }}
                                                                    className="relative p-3 rounded-lg text-left transition-all duration-200 bg-[var(--bg-tertiary)] hover:bg-[color:var(--accent-primary)]/10 hover:shadow-md border border-transparent hover:border-[color:var(--accent-primary)]/30 group"
                                                                >
                                                                    {/* Preview thumbnail */}
                                                                    <div className="w-full h-16 mb-2 rounded-md bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center overflow-hidden">
                                                                        <div className="text-2xl opacity-60 group-hover:opacity-100 transition-opacity">
                                                                            {snippet.icon}
                                                                        </div>
                                                                    </div>

                                                                    {/* Snippet info */}
                                                                    <div className="flex items-start gap-2">
                                                                        <div className="flex-1 min-w-0">
                                                                            <h4 className="font-medium text-[color:var(--text-primary)] text-xs mb-0.5">
                                                                                {snippet.name}
                                                                            </h4>
                                                                            <p className="text-[10px] text-[color:var(--text-tertiary)] line-clamp-2">
                                                                                {snippet.description}
                                                                            </p>
                                                                        </div>
                                                                    </div>

                                                                    {/* Column support badge */}
                                                                    {snippet.columnSupport && snippet.columnSupport !== 'both' && (
                                                                        <div className="absolute top-2 right-2">
                                                                            <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${
                                                                                snippet.columnSupport === 'single'
                                                                                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                                                                                    : 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300'
                                                                            }`}>
                                                                                {snippet.columnSupport === 'single' ? '1 Col' : '2 Col'}
                                                                            </span>
                                                                        </div>
                                                                    )}

                                                                    {/* Drag handle hint */}
                                                                    <div className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-40 transition-opacity">
                                                                        <GripVertical size={10} />
                                                                    </div>
                                                                </motion.button>
                                                            ))}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 bg-[var(--bg-tertiary)] border-t border-[color:var(--border-secondary)]">
                            <p className="text-xs text-[color:var(--text-tertiary)] text-center">
                                Click a section to see available layout styles. Each style can be customized after adding.
                            </p>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default AddSectionModal;
