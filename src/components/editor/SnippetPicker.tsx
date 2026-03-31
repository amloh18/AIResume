'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { SnippetCategory, SnippetDefinition } from '@/types/snippets';
import { useSnippetStore } from '@/lib/stores/snippetStore';
import { LayoutType } from '@/lib/templates/template-definition';

interface SnippetPickerProps {
  category: SnippetCategory;
  layout?: LayoutType;
  onClose: () => void;
  anchorRect?: DOMRect | null;
}

const CATEGORY_LABELS: Record<SnippetCategory, string> = {
  skills: 'Skills Layout',
  dates: 'Date Format',
  sectionTitle: 'Section Title Style',
  summary: 'Summary Style',
  basic: 'Contact Style',
};

export const SnippetPicker: React.FC<SnippetPickerProps> = ({
  category,
  layout,
  onClose,
  anchorRect,
}) => {
  const { activeSnippets, setSnippet, getAvailableSnippets } = useSnippetStore();
  const snippets = getAvailableSnippets(category, layout);
  const activeId = activeSnippets[category];

  const handleSelect = (snippetId: string) => {
    setSnippet(category, snippetId);
    onClose();
  };

  // Position relative to anchor or center screen
  const style: React.CSSProperties = anchorRect
    ? {
        position: 'absolute',
        top: anchorRect.bottom + 8,
        left: Math.max(8, anchorRect.left - 100),
        zIndex: 200,
      }
    : {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 200,
      };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[199]"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -4 }}
        transition={{ duration: 0.15 }}
        style={style}
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden w-[280px]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            {CATEGORY_LABELS[category]}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"
          >
            <X size={14} />
          </button>
        </div>

        {/* Snippet list */}
        <div className="p-2 max-h-[300px] overflow-y-auto">
          {snippets.map((snippet) => {
            const isActive = activeId === snippet.id;

            return (
              <button
                key={snippet.id}
                onClick={() => handleSelect(snippet.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg mb-1 transition-colors ${
                  isActive
                    ? 'bg-lime-50 dark:bg-lime-900/20 border border-lime-200 dark:border-lime-800'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className={`text-sm font-medium ${isActive ? 'text-lime-700 dark:text-lime-300' : 'text-gray-900 dark:text-white'}`}>
                      {snippet.name}
                    </div>
                    {snippet.description && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {snippet.description}
                      </div>
                    )}
                  </div>
                  {isActive && (
                    <Check size={14} className="text-lime-600 dark:text-lime-400 flex-shrink-0" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </motion.div>
    </>
  );
};

export default SnippetPicker;
