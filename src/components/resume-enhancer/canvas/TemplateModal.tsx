'use client';

/**
 * TemplateModal -- full-screen modal showing categorized template grid.
 * Each template shows a static mini-preview. Selecting one reconfigures
 * the canvas zones and layout.
 */

import React, { useState, memo } from 'react';
import { X } from 'lucide-react';
import type { CanvasTemplate } from './snippetTypes';
import { TEMPLATE_CATEGORIES } from './snippetTypes';

interface TemplateModalProps {
  templates: CanvasTemplate[];
  onSelect: (template: CanvasTemplate) => void;
  onClose: () => void;
}

function TemplateModalInner({ templates, onSelect, onClose }: TemplateModalProps) {
  const [activeCategory, setActiveCategory] = useState('all');

  const filtered =
    activeCategory === 'all'
      ? templates
      : templates.filter((t) => t.category === activeCategory);

  return (
    <div
      className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#141810] rounded-2xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-[color:var(--text-primary)]">Choose a Template</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Category tabs */}
        <div className="flex items-center gap-1 px-6 py-3 border-b border-gray-100 dark:border-gray-800 overflow-x-auto">
          {TEMPLATE_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                activeCategory === cat.id
                  ? 'bg-[var(--cv-accent,#2563eb)] text-white'
                  : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Template grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((tmpl) => (
              <button
                key={tmpl.id}
                onClick={() => onSelect(tmpl)}
                className="group relative bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:ring-2 hover:ring-[var(--cv-accent,#2563eb)] transition-all hover:shadow-lg"
              >
                {/* Mini preview */}
                <div className="aspect-[3/4] bg-gray-50 dark:bg-gray-900 p-3 flex items-start justify-center">
                  <TemplatePreviewThumb template={tmpl} />
                </div>
                {/* Label */}
                <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-800">
                  <p className="text-xs font-medium text-[color:var(--text-primary)] truncate">
                    {tmpl.name}
                  </p>
                  <p className="text-[10px] text-gray-400 capitalize">{tmpl.category}</p>
                </div>
              </button>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm">
              No templates in this category.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Tiny static preview of a template layout */
function TemplatePreviewThumb({ template }: { template: CanvasTemplate }) {
  const layout = template.layout;
  const accent = template.accentColor;

  const barStyle = { backgroundColor: accent, borderRadius: 2 };
  const grayBar = { backgroundColor: '#e5e7eb', borderRadius: 2 };

  if (layout.includes('sidebar')) {
    const sidebarLeft = layout.includes('left') || layout === 'dark-sidebar-left';
    const isDark = layout.includes('dark');

    return (
      <div className="w-full h-full flex gap-1.5 p-1">
        {sidebarLeft && (
          <div
            className="w-[35%] rounded-sm p-1.5 space-y-1.5"
            style={{ backgroundColor: isDark ? '#1f2937' : '#f3f4f6' }}
          >
            <div className="h-2 w-full rounded-sm" style={barStyle} />
            <div className="h-1 w-3/4 rounded-sm" style={grayBar} />
            <div className="h-1 w-2/3 rounded-sm" style={grayBar} />
            <div className="h-1 w-full rounded-sm" style={grayBar} />
          </div>
        )}
        <div className="flex-1 p-1.5 space-y-1.5">
          <div className="h-2.5 w-3/4 rounded-sm" style={barStyle} />
          <div className="h-1 w-full rounded-sm" style={grayBar} />
          <div className="h-1 w-full rounded-sm" style={grayBar} />
          <div className="h-1 w-5/6 rounded-sm" style={grayBar} />
          <div className="h-1.5 w-1/2 rounded-sm mt-2" style={barStyle} />
          <div className="h-1 w-full rounded-sm" style={grayBar} />
          <div className="h-1 w-4/5 rounded-sm" style={grayBar} />
        </div>
        {!sidebarLeft && (
          <div
            className="w-[35%] rounded-sm p-1.5 space-y-1.5"
            style={{ backgroundColor: isDark ? '#1f2937' : '#f3f4f6' }}
          >
            <div className="h-2 w-full rounded-sm" style={barStyle} />
            <div className="h-1 w-3/4 rounded-sm" style={grayBar} />
            <div className="h-1 w-2/3 rounded-sm" style={grayBar} />
          </div>
        )}
      </div>
    );
  }

  // Default 1-col or 2-col
  return (
    <div className="w-full h-full p-1.5 space-y-1.5">
      <div className="h-3 w-2/3 mx-auto rounded-sm" style={barStyle} />
      <div className="h-1 w-1/2 mx-auto rounded-sm" style={grayBar} />
      <div className="h-0.5" />
      <div className="h-1.5 w-1/3 rounded-sm" style={barStyle} />
      <div className="h-1 w-full rounded-sm" style={grayBar} />
      <div className="h-1 w-full rounded-sm" style={grayBar} />
      <div className="h-1 w-4/5 rounded-sm" style={grayBar} />
      <div className="h-0.5" />
      <div className="h-1.5 w-1/3 rounded-sm" style={barStyle} />
      <div className="h-1 w-full rounded-sm" style={grayBar} />
      <div className="h-1 w-5/6 rounded-sm" style={grayBar} />
    </div>
  );
}

const TemplateModal = memo(TemplateModalInner);
export default TemplateModal;
