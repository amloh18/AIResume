# Application Flow & User Control (P5)

How one application moves through BuildAIResume, what each state means, and
every control the user has when the pipeline parks or fails.

Product flow:

    BUILD → MATCH → TAILOR → SUBMIT → TRACK

The sidebar's **Application Flow** stepper (analytics tab) renders exactly this,
with the current position derived from live data — see
`applicationFlow` in `src/components/dashboard/jobs/JobSidebar.tsx`.

---

## 1. Where an application can be

`JobApplication.status` is the user-facing stage (saved → created/staging →
applied → interview → offer/rejected). The pipeline truth lives in
`internalStatus` plus the reason of the latest `APPLICATION_REQUIRES_REVIEW`
event (joined as `reviewReason` by `GET /api/jobs`).

| internalStatus          | Meaning                                   | Badge label         | Required action            |
| ----------------------- | ----------------------------------------- | ------------------- | -------------------------- |
| `queued`/`processing`/`form_detected`/`submitting` | worker has it or will     | Submitting (+ ETA)  | none — wait                |
| `review_required` (approval hold) | documents prepared in review mode | Awaiting approval | **Approve & submit**       |
| `review_required` (manual/CAPTCHA/no-form) | automation cannot proceed     | Apply manually      | **Apply manually** (dismiss) |
| `review_required` (unverified submission) | run submitted but evidence missing | Needs your action | verify manually (no one-click) |
| `automation_failed` / dead-lettered | run failed                       | Failed              | **Retry** / apply manually |
| `automation_unknown`    | outcome never confirmed                  | Needs your action   | verify manually            |
| `automation_dismissed`  | user took over, automation off           | Apply manually      | apply + mark applied       |

The single derivation lives in `src/lib/utils/application-status-badge.ts`
(returns `{label, tone, icon, title?, eta?, action?}`) and is rendered by the
shared `src/components/jobs/JobStatusActionChip.tsx` in both the applications
list and the kanban card, so both surfaces always agree.

---

## 2. The control endpoint

`POST /api/applications/[id]/automation` — body `{ action: 'approve' | 'dismiss' | 'retry' }`.

Logic: `src/lib/services/applicationAutomationActionService.ts`.
Route: `src/app/api/applications/[id]/automation/route.ts` (maps typed
`AutomationActionError` codes → 400/403/404/409).

### approve
- Allowed only from `review_required`, and **never** when the park reason says
  the submission went out unverified (double-apply hazard → 409).
- Reuses the latest `ApplicationQueue` document: `status:'queued'`,
  `mode:'auto'`, `priority:90`, attempts reset, locks cleared. Keeps its
  unique `idempotencyKey` and original quota reservation (quota is consumed at
  enqueue time, so a re-queue does NOT consume a second unit).
- Orphan rows (no queue document at all) reserve + consume quota exactly like
  `POST /api/jobs/auto-apply`; quota exhaustion returns 403.
- Sets `internalStatus:'queued'`, clears dead-letter fields, appends a
  `stageHistory` entry (`source:'user'`) and an `APPLICATION_REVIEW_DECIDED`
  event, marks matching unread notifications read.

### retry
- Same re-queue path, allowed from `automation_failed`/`automation_unknown`/
  dead-lettered only. Resets dead-letter bookkeeping.

### dismiss
- User applies manually. Cancels **queued** items (a genuinely `processing`
  item blocks dismissal with 409 — Playwright cannot be stopped mid-submit),
  sets `internalStatus:'automation_dismissed'`, `applicationMethod:'manual'`,
  `automationEnabled:false`, records the decision, clears notifications.
- UI opens the job posting in a new tab after a successful dismiss.

All three surfaces (list row, kanban card, journey sidebar) call this same
endpoint through `ApplicationsPanel.handleAutomationAction` /
`JobSidebar.handleAutomationAction` (toast + `jobUpdated` event + `loadData()`
re-sync; a rejected call re-fetches because the state likely moved).

---

## 3. Queue position & ETA

`src/lib/utils/queue-eta.ts`:

- Worker claims one item at a time with `sort: { priority: -1, scheduledAt: 1 }`
  (concurrency 1), so ETA = (slots ahead × 75s) + own run; a running item
  counts as half a run remaining; clamped to 30s–30min.
- `GET /api/jobs` attaches `queuePosition`/`queueEtaSeconds` to every row with
  an active queue item; the badge shows `~N min left` and the approve/retry
  response carries the same estimate (`formatQueueEta`).
- Display estimate only — nothing in the worker consults it.

The 75s/application average is a tunable default
(`ESTIMATED_SECONDS_PER_APPLICATION`), not a commitment.

---

## 4. Notifications

Worker hook: `src/lib/worker/applicationActionNotifier.ts`, called from
`src/workers/applicationWorker.ts` after `processApplication` returns (and on
the escaping-exception path). Three types (model union + schema enum + default
in-app prefs):

| Type                            | When                                   |
| ------------------------------- | -------------------------------------- |
| `application_approval_required` | park reason is an approval hold        |
| `application_action_required`   | any other park (manual/CAPTCHA/watchdog) |
| `application_automation_failed` | run failed                             |

- Deep link: `/dashboard/jobs?tab=applications&jobId=<applicationId>` —
  `ApplicationsPanel` deep-links into that application's detail modal.
- `actionType:'review_job'` (server marks read on action) + `interactive:true`,
  so the toast button navigates to the exact application.
- 24h dedupe per type + `metadata.applicationId` — retry backoff cannot spam.
- Never throws: notifications cannot affect queue processing.
- Acting (approve/dismiss/retry) marks matching unread notifications read.

---

## 5. Where the UI shows all of this

- **Applications list** — status chip + action button + ETA
  (`JobsListView` → `JobStatusActionChip`).
- **Kanban cards** — same chip/inline variant, rendered only when the state is
  in-flight or demands action (`JobKanbanCard`).
- **Journey sidebar (analytics tab)** —
  - *Application Flow* stepper (BUILD → MATCH → TAILOR → SUBMIT → TRACK) with a
    per-state position note;
  - stage timeline: the current node becomes `blocked` ("Awaiting your
    approval"), `processing` ("Submitting via automation… ~2 min left") or
    `failed` ("Retry or apply manually") instead of a cheerful "Current";
  - *Next Action* card: `guidanceHub` overrides every pipeline state with the
    matching primary control (Approve & Submit / Retry / Apply Manually /
    Verify / Refresh) and secondary actions.
- **Dashboard** — `NeedsAttentionWidget` and the KPI `needsAttention` count now
  read real fields (`internalStatus`/`reviewReason`/`deadLetter`/…); the old
  `job.automationStatus` never existed and the widget's status query matched
  nothing.

---

## 6. Safety rules encoded here

1. Never re-submit an unverified submission (approve/retry refuse it; the
   badge offers no one-click verb for that park).
2. `dismiss` cancels queued items so the worker can never submit behind the
   user's back.
3. Nothing auto-submits without either AUTO mode consent or user approval —
   the user is the quality gate for their own application.
4. Quota is consumed once per actual enqueue, never per approval click.
5. A `processing` run cannot be cancelled from the UI (409) — honest about
   what can and cannot be stopped.
