/* eslint-disable react/no-unescaped-entities */
'use client';

import React from 'react';
import type { FixAnnotation } from './fix-annotation';

type AsTag = 'span' | 'p' | 'div';

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
   * where the right-side panel owns the “Fix it” UI).
   */
  inlineCard?: boolean;
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
  inlineCard = true
}: AnnotatedTextProps) {
  const Tag = as as any;
  const openFixes = (annotations || []).filter((f) => f.status === 'open' && f.fieldPath === fieldPath);
  if (!enabled || openFixes.length === 0) {
    return <Tag className={className}>{text}</Tag>;
  }

  const active = openFixes.find((f) => f.id === activeFixId) || openFixes[0];
  const start = active.match?.start ?? null;
  const end = active.match?.end ?? null;

  const hasExactSpan = start != null && end != null && start >= 0 && end >= start && end <= text.length;
  const before = hasExactSpan ? text.slice(0, start!) : '';
  const middle = hasExactSpan ? text.slice(start!, end!) : text;
  const after = hasExactSpan ? text.slice(end!) : '';

  const handleSelect = () => {
    onSelectFix?.(active.id);
  };

  // Determine visual style based on category and severity
  // Keywords category with found matches = blue (positive), missing = red/yellow
  const isKeywordCategory = active.category === 'keywords';
  const isFoundKeyword = isKeywordCategory && active.severity === 'low'; // Low severity for keywords often means "found"
  
  const severityClasses =
    isFoundKeyword
      ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/50'
      : active.severity === 'high'
        ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-b-2 border-red-500/70'
        : active.severity === 'medium'
          ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-b-2 border-amber-500/70'
          : 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-b border-sky-500/60';

  const isActive = activeFixId === active.id;

  // Accessibility icons for color blindness
  const getAccessibilityIcon = () => {
    if (isFoundKeyword) return '✓'; // Found keyword
    if (active.severity === 'high') return '🛑'; // Critical
    if (active.severity === 'medium') return '⚠️'; // Warning
    return 'ℹ️'; // Info
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
        title="Click to select suggestion"
        data-field-path={fieldPath}
        data-fix-id={active.id}
        data-fix-severity={active.severity}
      >
        {/* Accessibility icon in margin */}
        <span className="text-[10px] opacity-70" aria-label={active.severity === 'high' ? 'Critical issue' : active.severity === 'medium' ? 'Warning' : 'Info'}>
          {getAccessibilityIcon()}
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
            <span className="block text-[11px] text-[color:var(--text-tertiary)] mb-2">Suggested fix</span>
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


