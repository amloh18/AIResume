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
  onDismissFix
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

  return (
    <Tag className={className}>
      <span
        className="relative cursor-pointer"
        onClick={handleSelect}
        title="Click to select suggestion"
      >
        {hasExactSpan ? (
          <>
            <span>{before}</span>
            <mark className="bg-yellow-200 text-gray-900 underline decoration-red-400/70 rounded px-0.5">
              {middle}
            </mark>
            <span>{after}</span>
          </>
        ) : (
          <mark className="bg-yellow-200 text-gray-900 underline decoration-red-400/50 rounded px-0.5">
            {middle}
          </mark>
        )}

        {openFixes.length > 1 && (
          <span className="ml-2 inline-flex items-center px-2 py-0.5 text-[10px] rounded-full bg-black/5 dark:bg-white/5 text-[color:var(--text-secondary)] shadow-sm shadow-black/10 dark:shadow-black/30">
            {openFixes.length} issues
          </span>
        )}
      </span>

      {/* Suggestion overlay (Grammarly-like) */}
      {activeFixId === active.id && (
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


