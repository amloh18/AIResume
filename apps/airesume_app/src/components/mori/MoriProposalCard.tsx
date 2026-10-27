'use client';

import React from 'react';
import { Check, X, Undo2, FileDiff, AlertCircle } from 'lucide-react';
import type { MoriProposedChange } from '@/lib/utils/mori-proposed-changes';

export type MoriProposalStatus = 'pending' | 'applied' | 'declined';

interface MoriProposalCardProps {
  changes: MoriProposedChange[];
  hiddenCount?: number;
  status: MoriProposalStatus;
  disabled?: boolean;
  onApply: () => void;
  onDecline: () => void;
  onUndo?: () => void;
}

function ChangeRow({ change }: { change: MoriProposedChange }) {
  const heading = [change.section, change.label, change.field].filter(Boolean).join(' · ');

  return (
    <li className="rounded-lg border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-white/[0.03] px-2.5 py-2">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {heading}
        </span>
        <span
          className={`shrink-0 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
            change.kind === 'added'
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : change.kind === 'removed'
                ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
          }`}
        >
          {change.kind}
        </span>
      </div>

      {change.before && (
        <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 line-through decoration-red-400/60 whitespace-pre-line">
          {change.before}
        </p>
      )}
      {change.after && (
        <p className="mt-1 text-[11px] leading-relaxed text-slate-800 dark:text-slate-100 whitespace-pre-line">
          {change.after}
        </p>
      )}
    </li>
  );
}

/**
 * Review surface for a Mori edit.
 *
 * Nothing reaches the editor until Apply is pressed: the user sees exactly what
 * would change, entry by entry, and can Decline or Undo it. This is the
 * "review before write" contract for AI edits on a document the user owns.
 */
export default function MoriProposalCard({
  changes,
  hiddenCount = 0,
  status,
  disabled = false,
  onApply,
  onDecline,
  onUndo,
}: MoriProposalCardProps) {
  const isPending = status === 'pending';

  return (
    <div className="mt-2 ml-9 max-w-[90%] rounded-xl border border-emerald-200/80 dark:border-emerald-500/25 bg-emerald-50/60 dark:bg-emerald-500/[0.06] p-3">
      <div className="flex items-center gap-2">
        <FileDiff className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
          {isPending
            ? `${changes.length + hiddenCount} ${changes.length + hiddenCount === 1 ? 'change' : 'changes'} proposed`
            : status === 'applied'
              ? 'Changes applied'
              : 'Changes declined'}
        </span>
      </div>

      <ul className="mt-2 space-y-1.5">
        {changes.map((change, index) => (
          <ChangeRow key={`${change.section}-${change.label}-${change.field}-${index}`} change={change} />
        ))}
        {hiddenCount > 0 && (
          <li className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 px-1">
            +{hiddenCount} more change{hiddenCount === 1 ? '' : 's'}
          </li>
        )}
      </ul>

      {!isPending && (
        <p className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
          {status === 'applied' ? (
            <>
              <Check className="w-3 h-3 text-emerald-500" />
              Your CV has been updated.
            </>
          ) : (
            <>
              <AlertCircle className="w-3 h-3 text-slate-400" />
              Your CV was left unchanged.
            </>
          )}
        </p>
      )}

      <div className="mt-2.5 flex items-center gap-2">
        {isPending ? (
          <>
            <button
              type="button"
              onClick={onApply}
              disabled={disabled}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              Apply
            </button>
            <button
              type="button"
              onClick={onDecline}
              disabled={disabled}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-slate-600 dark:text-slate-300 border border-slate-300/80 dark:border-white/15 hover:bg-white dark:hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Decline
            </button>
          </>
        ) : status === 'applied' && onUndo ? (
          <button
            type="button"
            onClick={onUndo}
            disabled={disabled}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-slate-600 dark:text-slate-300 border border-slate-300/80 dark:border-white/15 hover:bg-white dark:hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Undo2 className="w-3.5 h-3.5" />
            Undo
          </button>
        ) : null}
      </div>
    </div>
  );
}
