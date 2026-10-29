/**
 * Verify the customer copy for an application that is waiting to be submitted.
 *
 * Run: npx tsx --require ./scripts/server-only-shim.js tests/verify-apply-copy.ts
 *
 * The queue is an implementation detail. It used to be rendered as one
 * ("Queued for Auto-Apply — 3 ahead of you", "Estimated start ~1 min", a bar
 * parked at 40%), which told the customer they had to sit and watch a job that
 * runs on the worker anyway, and promised a time we cannot guarantee. These
 * checks pin the customer-facing sentences so the queue language cannot come
 * back through a later edit, while the operator diagnostic stays available.
 */

import {
  deriveApplicationProgress,
  QUEUE_STALL_SECONDS,
  type ApplicationProgress,
} from '../src/lib/applications/live-progress';

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function section(title: string) {
  console.log(`\n${title}`);
}

function queued(overrides: Record<string, unknown> = {}): ApplicationProgress {
  return deriveApplicationProgress({
    applicationId: 'app_1',
    currentStage: 'created',
    status: 'created',
    internalStatus: 'queued',
    queueStatus: 'queued',
    queueEtaSeconds: 60,
    queuePosition: 3,
    queuedForSeconds: 5,
    journeyStatus: 'ready',
    hasCV: true,
    hasCoverLetter: true,
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  } as any);
}

/** Copy that reads as internal queue vocabulary or as a promise about timing. */
const QUEUE_JARGON = /queued|queue|ahead of you|estimated|starts|min\b|worker|auto-apply/i;

const fresh = queued();

section('A freshly queued application');
check('is reported as running', fresh.state === 'running', fresh.state);
check('is in the queued phase', fresh.phase === 'queued', fresh.phase);
check(
  'the live sentence does not talk about a queue',
  !QUEUE_JARGON.test(fresh.liveText),
  fresh.liveText,
);
check(
  'the live sentence says it runs in the background',
  /background/i.test(fresh.liveText),
  fresh.liveText,
);
check(
  'the detail line promises no start time',
  !/estimated|starts|~?\d+\s*(min|minute|sec)/i.test(fresh.detail || ''),
  fresh.detail,
);
check(
  'the detail line tells the user they can leave',
  /close this|keep browsing|let you know/i.test(fresh.detail || ''),
  fresh.detail,
);
check(
  'the queue depth is still exposed for ops surfaces',
  fresh.queuePosition === 3,
  String(fresh.queuePosition),
);
check(
  'the percent sits inside the queued band, not at the end',
  fresh.percent >= 40 && fresh.percent < 48,
  String(fresh.percent),
);

section('A queue that is deeper than one page');
const deep = queued({ queuePosition: 41 });
check(
  'queue depth never reaches the customer copy',
  !/\b41\b|ahead/i.test(deep.liveText + ' ' + (deep.detail || '')),
  `${deep.liveText} / ${deep.detail}`,
);

section('A stalled queue');
const stalled = queued({ queuedForSeconds: QUEUE_STALL_SECONDS + 60 });
check('is flagged as stalled', stalled.stalled === true);
check(
  'still does not claim the customer must act on the queue',
  !/queued|queue/i.test(stalled.liveText),
  stalled.liveText,
);
check(
  'keeps an operator diagnostic',
  stalled.diagnostic?.code === 'queue_stalled',
  String(stalled.diagnostic?.code),
);
check(
  'the diagnostic names the internal cause (never rendered)',
  /WORKER_ROLE|auto-apply/i.test(stalled.diagnostic?.message || ''),
  stalled.diagnostic?.message,
);
check(
  'the customer copy is the softer one',
  /longer than usual/i.test(stalled.liveText),
  stalled.liveText,
);

section('A run the worker has already claimed');
const claimed = queued({ queueStatus: 'processing', internalStatus: 'processing' });
check(
  'leaves the queued phase once claimed',
  claimed.phase !== 'queued',
  claimed.phase,
);
check(
  'never reports a stall while the worker holds the row',
  claimed.stalled !== true,
);

section('Document generation (unchanged by this copy)');
const documents = deriveApplicationProgress({
  applicationId: 'app_2',
  currentStage: 'created',
  status: 'created',
  internalStatus: 'staging_cv_generating',
  journeyStatus: 'generating',
  hasCV: false,
  updatedAt: new Date('2026-01-01T00:00:00Z'),
});
check('is still the documents phase', documents.phase === 'documents', documents.phase);
check(
  'still describes what is being written',
  /Writing your cover letter|Tailoring your CV/i.test(documents.liveText),
  documents.liveText,
);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
