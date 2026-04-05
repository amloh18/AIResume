'use client';

/**
 * SnippetPickerModal -- modal for replacing a snippet with another of the
 * same category, or adding a new snippet to a zone.
 */

import React, { useState, memo } from 'react';
import { X } from 'lucide-react';
import { SNIPPETS, getSnippetsForCategory } from './snippets';
import type { SnippetCategoryId } from './snippetTypes';

const ALL_CATEGORIES: { id: SnippetCategoryId; label: string }[] = [
  { id: 'header', label: 'Header' },
  { id: 'summary', label: 'Summary' },
  { id: 'experience', label: 'Experience' },
  { id: 'education', label: 'Education' },
  { id: 'skills', label: 'Skills' },
  { id: 'projects', label: 'Projects' },
  { id: 'certifications', label: 'Certifications' },
  { id: 'contact', label: 'Contact' },
  { id: 'languages', label: 'Languages' },
  { id: 'volunteer', label: 'Volunteer' },
  { id: 'awards', label: 'Awards' },
  { id: 'publications', label: 'Publications' },
  { id: 'interests', label: 'Interests' },
  { id: 'references', label: 'References' },
];

interface SnippetPickerModalProps {
  mode: 'replace' | 'add';
  category?: SnippetCategoryId;
  onSelect: (snippetId: string, category: SnippetCategoryId) => void;
  onClose: () => void;
}

function SnippetPickerModalInner({ mode, category, onSelect, onClose }: SnippetPickerModalProps) {
  const [activeCategory, setActiveCategory] = useState<SnippetCategoryId | 'all'>(
    category || 'all',
  );

  const categories =
    mode === 'replace' && category
      ? ALL_CATEGORIES.filter((c) => c.id === category)
      : ALL_CATEGORIES;

  const snippets =
    activeCategory === 'all'
      ? Object.values(SNIPPETS)
      : getSnippetsForCategory(activeCategory);

  return (
    <div
      className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#141810] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[75vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-sm text-[color:var(--text-primary)]">
            {mode === 'replace' ? 'Replace Section Variant' : 'Add Section'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X size={16} />
          </button>
        </div>

        {/* Category filter (only for add mode) */}
        {mode === 'add' && (
          <div className="flex items-center gap-1 px-5 py-2 border-b border-gray-100 dark:border-gray-800 overflow-x-auto">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors ${
                activeCategory === 'all'
                  ? 'bg-[var(--cv-accent,#2563eb)] text-white'
                  : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors whitespace-nowrap ${
                  activeCategory === cat.id
                    ? 'bg-[var(--cv-accent,#2563eb)] text-white'
                    : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}

        {/* Snippet grid */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-3">
            {snippets.map((snippet) => (
              <button
                key={snippet.id}
                onClick={() => onSelect(snippet.id, snippet.category)}
                className="text-left p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-[var(--cv-accent,#2563eb)] hover:ring-1 hover:ring-[var(--cv-accent,#2563eb)] transition-all bg-white dark:bg-[#1e1e1e]"
              >
                <p className="text-sm font-medium text-[color:var(--text-primary)]">
                  {snippet.name}
                </p>
                <p className="text-[10px] text-gray-400 capitalize mt-0.5">
                  {snippet.category}
                </p>
                {snippet.description && (
                  <p className="text-[10px] text-gray-500 mt-1">{snippet.description}</p>
                )}
              </button>
            ))}
          </div>

          {snippets.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">
              No snippets available for this category.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const SnippetPickerModal = memo(SnippetPickerModalInner);
export default SnippetPickerModal;
