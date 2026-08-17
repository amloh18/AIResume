/* eslint-disable react/no-unescaped-entities */
'use client';

import React from 'react';
import type { FixAnnotation, FixCategory } from './fix-annotation';

type AsTag = 'span' | 'p' | 'div';

// Category-based color system for inline markers
const CATEGORY_COLORS: Record<FixCategory, { bg: string; text: string; border: string; label: string }> = {
  impact: { bg: 'bg-amber-500/10', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-500/70', label: 'Impact' },
  keywords: { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', border: 'border-red-500/70', label: 'Keywords' },
  clarity: { bg: 'bg-sky-500/10', text: 'text-sky-700 dark:text-sky-300', border: 'border-sky-500/60', label: 'Clarity' },
  formatting: { bg: 'bg-violet-500/10', text: 'text-violet-700 dark:text-violet-300', border: 'border-violet-500/60', label: 'Format' },
  grammar: { bg: 'bg-rose-500/10', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-500/60', label: 'Grammar' },
  structure: { bg: 'bg-teal-500/10', text: 'text-teal-700 dark:text-teal-300', border: 'border-teal-500/60', label: 'Structure' },
  other: { bg: 'bg-blue-500/10', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-500/60', label: 'General' },
};

interface AnnotatedTextProps {
  as?: AsTag;
  className?: string;
  fieldPath: string;
  text: string;
  enabled: boolean;
  annotations: FixAnnotation[];
  activeFixId?: string;
  onSelectFix?: (fixId: string) => void;
  onApplyFix?: (fix: FixAnnotation) => void;
  onDismissFix?: (fixId: string) => void;
  /**
   * When false, do not render the inline suggestion card (used by the contextual report,
   * where the right-side panel owns the "Fix it" UI).
   */
  inlineCard?: boolean;
  /**
   * Match annotations by content (originalText inside `text`) instead of by
   * fieldPath equality + precomputed offsets. Used when the rendered field is a
   * different view of the same data (e.g. the canvas renderer merges work
   * summary + highlights into a single description field).
   */
  contentMatch?: boolean;
}

export default function AnnotatedText({
  as = 'span',
  className,
  fieldPath,
  text,
  enabled,
  annotations,
  activeFixId,
  onSelectFix,
  onApplyFix,
  onDismissFix,
  inlineCard = true,
  contentMatch = false
}: AnnotatedTextProps) {
  const Tag = as as any;
  const openFixes = (annotations || []).filter((f) => {
    if (f.status !== 'open') return false;
    if (contentMatch) return !!f.originalText && !!text && text.includes(f.originalText);
    return f.fieldPath === fieldPath;
  });
  if (!enabled || openFixes.length === 0) {
    return <Tag className={className}>{text}</Tag>;
  }

  const active = openFixes.find((f) => f.id === activeFixId) || openFixes[0];
  const computedStart = contentMatch
    ? (active.originalText ? text.indexOf(active.originalText) : -1)
    : (active.match?.start ?? null);
  const start: number | null = computedStart == null ? null : (contentMatch ? (computedStart >= 0 ? computedStart : null) : computedStart);
  const end = contentMatch
    ? (start != null ? start + (active.originalText || '').length : null)
    : (active.match?.end ?? null);

  const hasExactSpan = start != null && end != null && start >= 0 && end >= start && end <= text.length;
  const before = hasExactSpan ? text.slice(0, start!) : '';
  const middle = hasExactSpan ? text.slice(start!, end!) : text;
  const after = hasExactSpan ? text.slice(end!) : '';

  const handleSelect = () => {
    onSelectFix?.(active.id);
  };

  // Get category-based color styling
  const categoryColor = CATEGORY_COLORS[active.category] || CATEGORY_COLORS.other;
  
  // Determine visual style based on category and severity
  const isKeywordCategory = active.category === 'keywords';
  const isFoundKeyword = isKeywordCategory && active.severity === 'low';
  
  const severityClasses = isFoundKeyword
    ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/50'
    : `${categoryColor.bg} ${categoryColor.text} border-b-2 ${categoryColor.border}`;

  const isActive = activeFixId === active.id;

  // Accessibility icons for category and severity
  const getCategoryIcon = () => {
    if (isFoundKeyword) return '✓';
    switch (active.category) {
      case 'impact': return '⚡';
      case 'keywords': return '🔍';
      case 'clarity': return '💡';
      case 'formatting': return '📐';
      case 'grammar': return '✏️';
      case 'structure': return '🏗️';
      default: return active.severity === 'high' ? '🛑' : active.severity === 'medium' ? '⚠️' : 'ℹ️';
    }
  };

  return (
    <Tag className={className}>
      <span
        className={[
          'relative cursor-pointer rounded-sm px-0.5 py-[1px] transition-colors inline-flex items-center gap-1',
          severityClasses,
          isActive ? 'ring-2 ring-[#80FF00]/50 ring-offset-2 ring-offset-transparent' : 'ring-0',
        ].join(' ')}
        onClick={handleSelect}
        title={`${categoryColor.label}: Click to select suggestion`}
        data-field-path={fieldPath}
        data-fix-id={active.id}
        data-fix-severity={active.severity}
        data-fix-category={active.category}
      >
        {/* Category icon in margin */}
        <span 
          className="text-[10px] opacity-70" 
          aria-label={`${categoryColor.label} - ${active.severity === 'high' ? 'Critical issue' : active.severity === 'medium' ? 'Warning' : 'Info'}`}
        >
          {getCategoryIcon()}
        </span>
        <span>
          {hasExactSpan ? (
            <>
              {before}
              <span>{middle}</span>
              {after}
            </>
          ) : (
            middle
          )}
        </span>

        {openFixes.length > 1 && (
          <span className="ml-2 inline-flex items-center px-2 py-0.5 text-[10px] rounded-full bg-black/5 dark:bg-white/5 text-[color:var(--text-secondary)] shadow-sm shadow-black/10 dark:shadow-black/30">
            {openFixes.length} issues
          </span>
        )}
      </span>

      {/* Suggestion overlay (Grammarly-like) */}
      {inlineCard && activeFixId === active.id && (
        <span className="mt-2 block">
          <span className="block bg-[var(--bg-tertiary)] rounded-xl p-3 shadow-sm shadow-black/10 dark:shadow-black/30">
            {/* Category badge */}
            <span className="flex items-center gap-2 mb-2">
              <span 
                className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md"
                style={{ 
                  color: categoryColor.text.includes('amber') ? '#f59e0b' : 
                         categoryColor.text.includes('red') ? '#ef4444' :
                         categoryColor.text.includes('sky') ? '#0ea5e9' :
                         categoryColor.text.includes('violet') ? '#8b5cf6' :
                         categoryColor.text.includes('rose') ? '#f43f5e' :
                         categoryColor.text.includes('teal') ? '#14b8a6' : '#3b82f6',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}
              >
                {categoryColor.label}
              </span>
              <span className="text-[9px] text-white/40">
                {active.severity === 'high' ? 'Critical' : active.severity === 'medium' ? 'Warning' : 'Suggestion'}
              </span>
            </span>

            <span className="block text-[11px] text-[color:var(--text-tertiary)] mb-2">
              {active.issue || 'Suggested fix'}
            </span>
            <span className="block text-sm text-white font-medium">
              {active.replacementText}
            </span>
            <span className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onApplyFix?.(active);
                }}
                className="px-3 py-1.5 rounded-lg bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-black text-xs font-semibold"
              >
                Apply
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDismissFix?.(active.id);
                }}
                className="px-3 py-1.5 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[color:var(--text-primary)] text-xs font-semibold shadow-sm shadow-black/10 dark:shadow-black/30"
              >
                Dismiss
              </button>
            </span>
          </span>
        </span>
      )}
    </Tag>
  );
}
