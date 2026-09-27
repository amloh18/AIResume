'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  CircleDashed,
  Loader2,
  X,
} from 'lucide-react';
import type {
  ApplicationProgress,
  ProgressState,
  ProgressSubstep,
} from '@/lib/applications/live-progress';
import { chipTone, type ChipTone } from '@/components/ui/chip-styles';

/**
 * Live application progress — the ONE progress bar.
 *
 * Replaces `JobCardProgressBar`'s seven-stop icon rail, which showed every
 * stage at once (Saving → Tailoring CV → Cover Letter → Applying → Interview →
 * Screening) so a card mid-run looked identical to a card that had finished
 * three of them. What the user actually needs at a glance is: *what is
 * happening right now*, and *how far along*.
 *
 * Layout (deliberate): the live sentence sits ABOVE the bar, because it is the
 * thing being read; the bar is the supporting measurement. Below the bar is one
 * line of context — the current step's position, or the single control the row
 * needs (approve / retry / take over).
 *
 * Everything rendered here comes from `ApplicationProgress`, which is derived
 * on the server. This component makes no decisions about state, so the four
 * surfaces that render it cannot drift apart.
 */

export interface LiveProgressBarProps {
  progress: ApplicationProgress;
  /** `compact` for job cards (one line of context), `full` for the sidebar. */
  variant?: 'compact' | 'full';
  /** Renders the substep list under the bar (defaults to `full`). */
  showSubsteps?: boolean;
  /**
   * The click just landed and the server row does not exist yet — show a
   * sliding bar instead of a percentage. Never guess a number here: a
   * fabricated 35% that stalls is worse than an honest "starting…".
   */
  indeterminate?: boolean;
  /** Called when the user clicks the row's control, if it has one. */
  onAction?: (actionId: NonNullable<ApplicationProgress['action']>['id']) => void;
  className?: string;
}

interface StateStyle {
  tone: ChipTone;
  /** Progress-bar fill. */
  bar: string;
  /** Live-text colour. */
  text: string;
  label: string;
}

const STATE_STYLES: Record<ProgressState, StateStyle> = {
  running: {
    tone: 'blue',
    bar: 'bg-[var(--color-primary)]',
    text: 'text-gray-800 dark:text-gray-100',
    label: 'Running',
  },
  waiting_user: {
    tone: 'amber',
    bar: 'bg-amber-500',
    text: 'text-amber-800 dark:text-amber-200',
    label: 'Needs you',
  },
  done: {
    tone: 'emerald',
    bar: 'bg-emerald-500',
    text: 'text-emerald-700 dark:text-emerald-300',
    label: 'Done',
  },
  failed: {
    tone: 'rose',
    bar: 'bg-rose-500',
    text: 'text-rose-700 dark:text-rose-300',
    label: 'Failed',
  },
  idle: {
    tone: 'neutral',
    bar: 'bg-gray-400 dark:bg-white/30',
    text: 'text-gray-600 dark:text-gray-400',
    label: 'Idle',
  },
};

function substepIcon(status: ProgressSubstep['status']) {
  switch (status) {
    case 'completed':
    case 'skipped':
      return <Check className="w-3 h-3 text-emerald-500" />;
    case 'active':
      return <Loader2 className="w-3 h-3 animate-spin text-[var(--color-primary)]" />;
    case 'failed':
      return <X className="w-3 h-3 text-rose-500" />;
    default:
      return <CircleDashed className="w-3 h-3 text-gray-300 dark:text-gray-600" />;
  }
}

/** "2 of 4" for the current step, so a long phase still feels bounded. */
function stepCounter(substeps: ProgressSubstep[]): string | null {
  if (substeps.length < 2) return null;
  const activeIndex = substeps.findIndex((s) => s.status === 'active');
  const index = activeIndex === -1 ? substeps.length : activeIndex + 1;
  return `Step ${index} of ${substeps.length}`;
}

/** The substep the bar is currently sitting on — the "current running step". */
function currentSubstep(substeps: ProgressSubstep[]): ProgressSubstep | undefined {
  return (
    substeps.find((s) => s.status === 'active') ||
    substeps.find((s) => s.status === 'pending') ||
    substeps[substeps.length - 1]
  );
}

/**
 * One console line per application per kind of trouble — a fire alarm, not a
 * heartbeat. The customer copy for a slow queue is deliberately calm, so this is
 * where the real signal survives. `progress.diagnostic` is also present on the
 * `/api/applications/progress` response, so an admin surface can read the same
 * fact directly instead of scraping logs.
 */
const reportedDiagnostics = new Set<string>();

function reportDiagnostic(progress: ApplicationProgress) {
  const d = progress.diagnostic;
  if (!d) return;
  const key = `${progress.applicationId}:${d.code}`;
  if (reportedDiagnostics.has(key)) return;
  reportedDiagnostics.add(key);
  // eslint-disable-next-line no-console
  console.warn(`[live-progress] ${d.code} — ${d.message}`);
}

export function LiveProgressBar({
  progress,
  variant = 'compact',
  showSubsteps,
  indeterminate = false,
  onAction,
  className = '',
}: LiveProgressBarProps) {
  /*
    Styling follows `state`, never `stalled`.

    A slow queue used to render amber with a "Stalled" label — but amber in this
    system means "needs you", and a queue the customer cannot do anything about
    is the opposite of that. Alarming someone over a problem that is not theirs
    is the same mistake as naming the internal role in the copy, one step later.
    A stalled row now looks like what we tell the customer it is: still working.
  */
  const style = STATE_STYLES[progress.state];
  const isRunning = progress.state === 'running';

  useEffect(() => {
    reportDiagnostic(progress);
  }, [progress]);
  const isFull = variant === 'full';
  const withSubsteps = showSubsteps ?? isFull;

  const counter = stepCounter(progress.substeps);
  const current = currentSubstep(progress.substeps);

  return (
    <div className={`w-full space-y-2 ${className}`}>
      {/* ── Live process text (above the bar, by design) ─────────────── */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-1.5 min-w-0">
          {isRunning ? (
            <span className="relative flex h-2 w-2 mt-1 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-primary)] opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-primary)]" />
            </span>
          ) : progress.state === 'failed' ? (
            <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0 text-rose-500" />
          ) : progress.state === 'done' ? (
            <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0 text-emerald-500" />
          ) : null}

          <AnimatePresence mode="wait">
            <motion.p
              key={progress.liveText}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.18 }}
              className={`text-[11px] font-semibold leading-snug ${style.text} ${
                isFull ? '' : 'truncate'
              }`}
              title={progress.detail ? `${progress.liveText} — ${progress.detail}` : progress.liveText}
            >
              {progress.liveText}
            </motion.p>
          </AnimatePresence>
        </div>

        {!indeterminate && (
          <span className="text-[11px] font-bold tabular-nums text-gray-500 dark:text-gray-400 shrink-0">
            {Math.round(progress.percent)}%
          </span>
        )}
      </div>

      {/* ── Progress bar ─────────────────────────────────────────────── */}
      <div
        className="relative w-full h-1.5 bg-gray-100 dark:bg-white/8 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={indeterminate ? undefined : Math.round(progress.percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={progress.phaseLabel}
      >
        {indeterminate ? (
          <motion.div
            className="absolute inset-y-0 w-1/3 rounded-full bg-[var(--color-primary)]"
            animate={{ x: ['-33%', '300%'] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          />
        ) : (
          <>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(Math.max(progress.percent, 0), 100)}%` }}
              transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
              className={`absolute inset-y-0 left-0 rounded-full ${style.bar}`}
            />
            {isRunning && (
              <motion.div
                className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-transparent via-white/40 to-transparent rounded-full"
                animate={{ x: ['-64px', '320px'] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
              />
            )}
          </>
        )}
      </div>

      {/* ── Context line: current step, or the control this row needs ─── */}
      {(counter || progress.eta || progress.action) && (
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0 text-[10px] text-gray-500 dark:text-gray-400">
            {counter && current && (
              <>
                <span className="font-bold uppercase tracking-wider shrink-0">{counter}</span>
                <span className="opacity-40">·</span>
                <span className="truncate">{current.label}</span>
              </>
            )}
            {!counter && progress.eta && <span className="truncate">Starts {progress.eta}</span>}
          </div>

          {progress.action && onAction && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAction(progress.action!.id);
              }}
              className={`${chipTone(style.tone, 'sm')} font-bold hover:opacity-90 transition-opacity`}
            >
              {progress.action.label}
            </button>
          )}
        </div>
      )}

      {/* ── Substeps of the CURRENT phase only ───────────────────────── */}
      {withSubsteps && progress.substeps.length > 0 && (
        <ul className="space-y-1 pt-0.5">
          {progress.substeps.map((step) => (
            <li key={step.key} className="flex items-center gap-2 text-[11px] leading-snug">
              <span className="shrink-0">{substepIcon(step.status)}</span>
              <span
                className={
                  step.status === 'active'
                    ? 'font-semibold text-gray-900 dark:text-white'
                    : step.status === 'completed' || step.status === 'skipped'
                      ? 'text-gray-500 dark:text-gray-400'
                      : 'text-gray-400 dark:text-gray-500'
                }
              >
                {step.label}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* ── Detail (customer-facing reason / reassurance) ────────────── */}
      {progress.detail &&
        (isFull ||
          progress.stalled ||
          progress.state === 'failed' ||
          progress.state === 'waiting_user') && (
          <p className="text-[10px] leading-snug text-gray-500 dark:text-gray-400">
            {progress.detail}
          </p>
        )}
    </div>
  );
}

export default LiveProgressBar;
