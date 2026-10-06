/**
 * Behavioural check for the live-progress derivation.
 *
 * Run:  node .verify/run-live-progress.mjs
 *
 * The derivation is the contract all four surfaces read, so it is verified
 * against real status values rather than trusted from the types. Bundled with
 * esbuild because `vitest run` exits 137 in this sandbox.
 */
import { deriveApplicationProgress, type ProgressInput } from '@/lib/applications/live-progress';

let failures = 0;
let checks = 0;

function check(name: string, actual: unknown, expected: unknown) {
  checks++;
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    failures++;
    console.error(`✗ ${name}\n    expected ${e}\n    actual   ${a}`);
  } else {
    console.log(`✓ ${name}`);
  }
}

const base = { applicationId: 'app1' };

// ── Nothing running ──────────────────────────────────────────────────
check('saved row is idle', deriveApplicationProgress({ ...base, status: 'saved' }).state, 'idle');
check(
  'saved row shows no bar phase',
  deriveApplicationProgress({ ...base, status: 'saved' }).phase,
  'saved',
);

// ── Staging substeps (previously never written) ──────────────────────
const cvGen = deriveApplicationProgress({ ...base, internalStatus: 'staging_cv_generating' });
check('cv generating → documents phase', cvGen.phase, 'documents');
check('cv generating → running', cvGen.state, 'running');
check(
  'cv generating → cv substep active',
  cvGen.substeps.find((s) => s.key === 'cv')?.status,
  'active',
);

const clGen = deriveApplicationProgress({ ...base, internalStatus: 'staging_cover_letter_generating' });
check(
  'cover letter generating → cover_letter active',
  clGen.substeps.find((s) => s.key === 'cover_letter')?.status,
  'active',
);
check(
  'cover letter generating → cv already done',
  clGen.substeps.find((s) => s.key === 'cv')?.status,
  'completed',
);

const ready = deriveApplicationProgress({ ...base, internalStatus: 'staging_ready' });
check('staging_ready → waiting on user', ready.state, 'waiting_user');
check('staging_ready → queued phase', ready.phase, 'queued');

// ── Queue + execution ───────────────────────────────────────────────
const queued = deriveApplicationProgress({
  ...base,
  internalStatus: 'queued',
  queueEtaSeconds: 120,
  queuePosition: 2,
});
check('queued → running', queued.state, 'running');
check('queued → eta formatted', queued.eta, '~2 min');
check('queued live text names position', queued.liveText, 'Queued for Auto-Apply — 1 ahead of you.');

check(
  'processing → form detection',
  deriveApplicationProgress({ ...base, internalStatus: 'processing' }).phase,
  'form_detection',
);

const filling = deriveApplicationProgress({ ...base, internalStatus: 'form_detected' });
check('form_detected → field fill', filling.phase, 'field_fill');
check('field fill is running', filling.state, 'running');

const withFields = deriveApplicationProgress({
  ...base,
  internalStatus: 'form_detected',
  artifacts: {
    atsType: 'greenhouse',
    detectedFields: [
      { label: 'First name', filled: true },
      { label: 'Email', filled: true },
      { label: 'Phone', filled: false },
    ],
    fillAudit: { totalFields: 3, filledFields: 1 },
  },
});
check('detected fields become substeps', withFields.substeps.length, 3);
check('live text names the ATS', withFields.liveText.includes('Greenhouse'), true);

const attached = deriveApplicationProgress({
  ...base,
  internalStatus: 'form_detected',
  artifacts: { fillAudit: { totalFields: 3, filledFields: 3 } },
});
check('all fields filled → attachments phase', attached.phase, 'attachments');

check(
  'submitting phase',
  deriveApplicationProgress({ ...base, internalStatus: 'submitting' }).phase,
  'submitting',
);
check(
  'verification phase',
  deriveApplicationProgress({ ...base, internalStatus: 'verification' }).phase,
  'verification',
);

// ── Settled ─────────────────────────────────────────────────────────
const applied = deriveApplicationProgress({ ...base, internalStatus: 'applied', currentStage: 'applied' });
check('applied → done', applied.state, 'done');
check('applied → 100%', applied.percent, 100);
check('applied → not active', applied.isActive, false);
check(
  'rejected → closed',
  deriveApplicationProgress({ ...base, internalStatus: 'rejected' }).phase,
  'rejected',
);

// ── Parks ───────────────────────────────────────────────────────────
const approve = deriveApplicationProgress({
  ...base,
  internalStatus: 'review_required',
  reviewReason: 'Review mode: documents prepared and held for your approval before submission.',
});
check('approval park → waiting on user', approve.state, 'waiting_user');
check('approval park → offers approve', approve.action?.id, 'approve');

const manual = deriveApplicationProgress({
  ...base,
  internalStatus: 'review_required',
  reviewReason: 'No application form detected at https://careers.airbnb.com/positions/8232474.',
});
check('no-form park → offers manual take-over', manual.action?.id, 'dismiss');
check('no-form park → names the halt', manual.liveText, 'We can’t submit this one automatically.');
check('no-form park → a URL-bearing reason is dropped', manual.detail?.includes('http'), false);
check('no-form park → falls back to curated copy', manual.detail?.includes('needs a human'), true);

const failed = deriveApplicationProgress({ ...base, internalStatus: 'automation_failed' });
check('failed → failed state', failed.state, 'failed');
check('failed → offers retry', failed.action?.id, 'retry');

const unknown = deriveApplicationProgress({ ...base, internalStatus: 'automation_unknown' });
check('unknown → waiting on user', unknown.state, 'waiting_user');
check('unknown → never offers a blind retry', unknown.action?.id, 'dismiss');

// ── Percent ordering (the bar must move forward, never back) ─────────
const order = [
  'staging_cv_generating',
  'staging_cover_letter_generating',
  'staging_ready',
  'queued',
  'processing',
  'form_detected',
  'submitting',
  'verification',
  'applied',
].map((s) => deriveApplicationProgress({ ...base, internalStatus: s }).percent);

let monotonic = true;
for (let i = 1; i < order.length; i++) {
  if (order[i] < order[i - 1]) monotonic = false;
}
check('percent never moves backwards', monotonic, true);
check('percent stays within 0..100', order.every((p) => p >= 0 && p <= 100), true);

// ── A journey still generating must not read as "saved" ──────────────
const journeyOnly = deriveApplicationProgress({
  ...base,
  internalStatus: 'saved',
  journeyStatus: 'processing_documents',
  hasCV: true,
});
check('journey generating → documents phase', journeyOnly.phase, 'documents');
check('journey generating → cover letter next', journeyOnly.liveText, 'Writing your cover letter…');

// ── Queue copy, and the customer/operator split ──────────────────────
const brieflyQueued = deriveApplicationProgress({
  ...base,
  internalStatus: 'queued',
  queueStatus: 'queued',
  queuedForSeconds: 60,
});
check('a short queue wait is not a stall', brieflyQueued.stalled, false);
check('a short queue wait reads as queued', brieflyQueued.liveText, 'Queued for Auto-Apply…');
check('a queued row carries no operator diagnostic', brieflyQueued.diagnostic, undefined);

const waitingBehind = deriveApplicationProgress({
  ...base,
  internalStatus: 'queued',
  queueStatus: 'queued',
  queuedForSeconds: 30,
  queuePosition: 4,
});
check(
  'queue position is phrased for a human',
  waitingBehind.liveText,
  'Queued for Auto-Apply — 3 ahead of you.',
);

/*
  The boundary matters: `/api/cron/auto-apply` recommends `*/5 * * * *`, so a healthy row can wait a
  full cron interval. A threshold of one interval was a false positive by construction.
*/
const oneCronInterval = deriveApplicationProgress({
  ...base,
  internalStatus: 'queued',
  queueStatus: 'queued',
  queuedForSeconds: 5 * 60,
});
check('one cron interval is not a stall', oneCronInterval.stalled, false);

const stalledQueue = deriveApplicationProgress({
  ...base,
  internalStatus: 'queued',
  queueStatus: 'queued',
  queuedForSeconds: 20 * 60,
});
check('a long queue wait is still flagged for operators', stalledQueue.stalled, true);
check('a stall is still "in flight"', stalledQueue.isActive, true);
check(
  'a stall reads calmly to the customer',
  stalledQueue.liveText,
  'Taking a little longer than usual…',
);
check('a stall reassures instead of alarming', stalledQueue.detail?.includes('No action needed'), true);
check('a stall still offers a way out', stalledQueue.detail?.includes('apply from the job posting'), true);
check('a stall carries the operator diagnosis', stalledQueue.diagnostic?.code, 'queue_stalled');
check(
  'the diagnosis names the internal cause',
  stalledQueue.diagnostic?.message.includes('WORKER_ROLE'),
  true,
);
check('the diagnosis reports the wait', stalledQueue.diagnostic?.waitedSeconds, 20 * 60);
check('the diagnosis never reaches liveText', stalledQueue.liveText.includes('WORKER_ROLE'), false);
check('the diagnosis never reaches detail', stalledQueue.detail?.includes('WORKER_ROLE'), false);
check('the diagnosis never reaches detail (cause)', stalledQueue.detail?.includes('draining'), false);

const processingStall = deriveApplicationProgress({
  ...base,
  internalStatus: 'queued',
  queueStatus: 'processing',
  queuedForSeconds: 12 * 60,
});
check('a claimed row is never flagged as stalled', processingStall.stalled ?? false, false);
check(
  'a claimed row advances to form detection',
  processingStall.phase,
  'form_detection',
);

// ── Raw server reasons must not reach the customer ───────────────────
const rawOperatorReason = deriveApplicationProgress({
  ...base,
  internalStatus: 'automation_failed',
  reviewReason: 'playwright selector #submit not found after 30000ms',
});
check(
  'a raw operator reason is dropped',
  rawOperatorReason.detail?.includes('playwright') ?? false,
  false,
);
check(
  'a dropped reason falls back to curated copy',
  rawOperatorReason.detail?.includes('Nothing was sent'),
  true,
);

const snakeReason = deriveApplicationProgress({
  ...base,
  internalStatus: 'review_required',
  reviewReason: 'automation_unknown_no_confirmation',
});
check(
  'a snake_case reason is dropped',
  snakeReason.detail?.includes('automation_unknown') ?? false,
  false,
);
check(
  'a dropped snake_case reason falls back to curated copy',
  snakeReason.detail?.includes('nothing is submitted without you'),
  true,
);

const fragmentReason = deriveApplicationProgress({
  ...base,
  internalStatus: 'review_required',
  reviewReason: 'no application form detected',
});
check(
  'a log fragment is dropped',
  fragmentReason.detail?.includes('no application form') ?? false,
  false,
);

const cleanReason = deriveApplicationProgress({
  ...base,
  internalStatus: 'review_required',
  reviewReason: 'The employer asks for a portfolio link.',
});
check('a clean sentence is kept', cleanReason.detail, 'The employer asks for a portfolio link.');

// ── The leak guard ───────────────────────────────────────────────────
/*
  The regression guard for the bug that started this: an ops sentence
  ("Queued for 12 min with no worker pickup") rendered inside a job card. Every
  status the derivation can produce is swept, and any internal vocabulary in
  copy a customer can read fails the run.
*/
/*
  Must stay a **superset** of the sanitiser's `OPERATOR_WORDS`. If this list were narrower, the sweep
  would pass while the sanitiser let a word through — which is exactly what happened: the first
  version omitted `ats` / `automation` / `engine` / the ATS vendor names, so the sweep never noticed
  that `ATS type "adzuna" is not automatable` was reaching the customer.
*/
const OPERATOR_VOCABULARY =
  /\b(worker|WORKER_ROLE|cron|queue|playwright|puppeteer|selector|locator|draining|stack trace|ENOENT|ECONN|mongoose|redis|env var|ats|automation|automatable|engine|adzuna|greenhouse|lever|ashby|workable|workday|naukri|indeed|jobspy|remotive|remoteok)\b/i;

const everyStatus: ProgressInput[] = [
  /*
    ⚠️ These are the reasons the server ACTUALLY writes, copied from the producers in
    `lib/worker/processApplication.ts` and `lib/services/unifiedApplyService.ts`. Inventing plausible
    reasons here is how the first version of this sweep passed while
    `ATS type "adzuna" is not automatable` was being rendered to customers — the sanitizer had a hole
    and the test never fed it the string that exposed it. When a producer changes, change this.
  */
  // processApplication.ts:110 — names the discovery source
  {
    internalStatus: 'review_required',
    reviewReason: 'ATS type "adzuna" is not automatable. Manual submission required.',
  },
  // processApplication.ts:129 — names Playwright
  {
    internalStatus: 'processing',
    reviewReason: 'ATS greenhouse detected. Playwright automation ready.',
  },
  // processApplication.ts:45 — names the worker and the queue
  { internalStatus: 'processing', reviewReason: 'Worker picked up application from queue' },
  // processApplication.ts:73-76 — decision-engine vocabulary
  {
    internalStatus: 'review_required',
    reviewReason:
      'Execution mode is "manual": automation is not permitted for this application. Submit it yourself, or re-queue it with mode "auto" to approve automated submission.',
  },
  {
    internalStatus: 'review_required',
    reviewReason: 'Decision engine returned "skip": this application must not be automated.',
  },
  // processApplication.ts:160 — must keep its dedicated branch
  {
    internalStatus: 'review_required',
    reviewReason:
      'Application submitted but no confirmation evidence captured. Needs manual verification.',
  },
  // processApplication.ts:234 / :255 — a raw error is interpolated into the reason
  { internalStatus: 'automation_failed', reviewReason: 'Automation failed: Selector #submit not found' },
  { internalStatus: 'automation_failed', reviewReason: 'Worker error: connect ECONNREFUSED 127.0.0.1' },
  // unifiedApplyService.ts:1308 — `Automated submission unavailable (${detail})`
  {
    internalStatus: 'review_required',
    reviewReason:
      'Tailored documents ready for Acme. Automated submission unavailable (Automation error: browser crashed). Please submit manually.',
  },
  // unifiedApplyService.ts:1274 — the generic fallback message
  {
    internalStatus: 'review_required',
    reviewReason:
      'Application documents staged for Acme. Review and submit on employer website.',
  },
  // A genuinely clean reason must still survive.
  {
    internalStatus: 'review_required',
    reviewReason: 'The employer asks for a portfolio link.',
  },
  {},
  { status: 'saved' },
  { currentStage: 'staging', status: 'created' },
  { internalStatus: 'staging_cv_generating' },
  { internalStatus: 'staging_cover_letter_generating' },
  { internalStatus: 'staging_ready' },
  { internalStatus: 'queued', queueStatus: 'queued', queuedForSeconds: 10 },
  { internalStatus: 'queued', queueStatus: 'queued', queuedForSeconds: 10, queuePosition: 3 },
  { internalStatus: 'queued', queueStatus: 'queued', queuedForSeconds: 12 * 60 },
  { internalStatus: 'queued', queueStatus: 'processing' },
  { internalStatus: 'processing' },
  { internalStatus: 'form_detected' },
  { internalStatus: 'form_detected', artifacts: { atsType: 'greenhouse' } },
  {
    internalStatus: 'form_detected',
    artifacts: {
      atsType: 'greenhouse',
      detectedFields: [{ label: 'Email', filled: true }],
      fillAudit: { totalFields: 3, filledFields: 3 },
    },
  },
  { internalStatus: 'submitting' },
  { internalStatus: 'verification' },
  { internalStatus: 'applied' },
  { internalStatus: 'interview' },
  { internalStatus: 'offer' },
  { internalStatus: 'rejected' },
  { internalStatus: 'review_required', reviewReason: 'Awaiting approval before submission' },
  { internalStatus: 'review_required', reviewReason: 'captcha present' },
  { internalStatus: 'review_required', reviewReason: 'no application form detected' },
  { internalStatus: 'review_required', reviewReason: 'no confirmation evidence found' },
  { internalStatus: 'review_required', reviewReason: 'something else entirely' },
  { internalStatus: 'automation_dismissed' },
  { internalStatus: 'automation_failed' },
  { internalStatus: 'automation_failed', deadLetter: true },
  { internalStatus: 'automation_unknown' },
  { journeyStatus: 'creation_failed' },
  { journeyStatus: 'processing_documents', hasCV: true },
];

const leaked: string[] = [];
for (const input of everyStatus) {
  const p = deriveApplicationProgress({ ...base, ...input });
  const visible = [
    p.liveText,
    p.detail,
    p.phaseLabel,
    ...p.substeps.map((s) => s.label),
    ...(p.action ? [p.action.label] : []),
  ];
  for (const text of visible) {
    if (text && OPERATOR_VOCABULARY.test(text)) {
      leaked.push(`"${text}"`);
    }
  }
}
check('no status leaks operator vocabulary into customer copy', leaked, []);

console.log(`\n${checks - failures}/${checks} checks passed`);
process.exit(failures === 0 ? 0 : 1);
