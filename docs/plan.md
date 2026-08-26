cat > /Users/amlohsl/Documents/VScode_projects/PROJECTS/cvcircle_app/plan.md << 'PLAN_EOF'
# AIResume Tracker — Full Compression, Redesign & Integration Plan

## Verified Working Features
- List View, Kanban View (drag-drop), Job CRUD, stage updates, ATS scores, Interview Mode, Focus Mode, keyboard shortcuts, duplicate detection, job limits
- Email AI assist works but has no credit check
- LinkedIn Auth and LinkedIn Enhancer are functional
- "Improve ATS" correctly navigates to `/editor?journeyId=...&cvId=...&mode=edit` (route exists at `src/app/editor/page.tsx`)

---

## Design System: Theme Tokens

All tracker, sidebar, kanban, and enhancer components must use CSS custom properties for theming instead of hardcoded Tailwind colors. Available tokens (from `src/app/globals.css`):

```
--bg-primary, --bg-secondary, --bg-tertiary
--text-primary, --text-secondary, --text-tertiary
--border-primary, --border-secondary
--hover-bg, --accent-primary, --accent-hover
--card-bg, --card-border, --sidebar-bg, --header-bg, --input-bg, --input-border
--modal-bg, --modal-border
```

Usage pattern: `bg-[var(--bg-primary)]`, `text-[color:var(--text-primary)]`, `border-[color:var(--border-primary)]`, `dark:bg-[var(--bg-secondary)]`, `dark:text-[color:var(--text-secondary)]`.

Current tracker files (`JobSidebar.tsx`, `JobKanbanCard.tsx`, stage views) use hardcoded `bg-white`, `dark:bg-[#141810]`, `text-gray-900`, etc. All new and modified components must use theme tokens.

---

## Phase 1: Foundation (Prerequisites for Redesign)

### Task 1.1: Expiry utility
**New file:** `src/utils/tracker-expiry.ts`
```typescript
export type ExpiryState = 'active' | 'flagged' | 'archivable';

export function getJobExpiryState(job: JobApplication): ExpiryState {
  let deadline: Date | null = null;
  if (job.status === 'offer' && job.offerStage?.deadline) {
    deadline = new Date(job.offerStage.deadline);
  } else if (job.status === 'interview' && job.interviewStage?.date) {
    deadline = new Date(job.interviewStage.date);
  }
  if (!deadline) return 'active';
  const now = new Date();
  const msPastDeadline = now.getTime() - deadline.getTime();
  if (msPastDeadline <= 0) return 'active';
  const GRACE_PERIOD = 48 * 60 * 60 * 1000;
  return msPastDeadline < GRACE_PERIOD ? 'flagged' : 'archivable';
}
```

### Task 1.2: Stage action config
**New file:** `src/components/dashboard/jobs/stages/config/stageActions.tsx`
```typescript
export interface StageActionConfig {
  primaryAction: { label: string; icon: string; onClick: (job: JobApplication) => void };
  secondaryActions: Array<{ label: string; onClick: (job: JobApplication) => void }>;
  renderContextualWidget: (job: JobApplication) => React.ReactNode;
}

export const STAGE_ACTION_MAP: Record<string, StageActionConfig> = {
  pipeline: { ... },
  applied: { ... },
  interview: { ... },
  offer: { ... },
  archive: { ... }
};
```

---

## Phase 2: Kanban Compression to 5 Columns (High Priority)

### 2.1 Column Definition

| Core Column | Sub-Statuses | Drag Targets (allowed drops) | Visual Treatment |
|---|---|---|---|
| `pipeline` | `draft`, `created` | Any non-archive → becomes `draft`; `pipeline` drops preserve `draft`/`created` | Tabs or divider inside column |
| `applied` | `applied`, `screening` | Any non-archive → becomes `applied`; `applied` drops preserve `screening` if applicable | `screening` shown as badge on card |
| `interview` | `interview` | Any non-archive → becomes `interview` | Multi-round indicator on card |
| `offer` | `offer` | Any non-archive → becomes `offer` | Distinct border/color treatment |
| `archive` | `rejected`, `withdrawn`, `accepted` | Only terminal → archive; archive drops preserve terminal status | Collapsed by default; skinny bar |

### 2.2 Grouping Logic
**File:** `src/components/dashboard/JobsTracker.tsx`
- Replace `jobsByStatus` with `useKanbanPipelines` hook
- Apply `getJobExpiryState`:
  - `expiry === 'archivable'` → force `archive`
  - `expiry === 'flagged'` → keep native column but apply expired visual state
  - `status in ['rejected', 'withdrawn', 'accepted']` → `archive`
  - `status in ['draft', 'created']` → `pipeline`
  - `status in ['applied', 'screening']` → `applied`
  - `status === 'interview'` → `interview`
  - `status === 'offer'` → `offer`

### 2.3 Drag-and-Drop Status Mapping
**File:** `src/components/dashboard/JobsKanbanView.tsx` + `JobsTracker.tsx`
- On drop to `pipeline`: set status to `draft`
- On drop to `applied`: set status to `applied` (preserve `screening` if already screening)
- On drop to `interview`: set status to `interview`
- On drop to `offer`: set status to `offer`
- On drop to `archive`: preserve existing terminal status; if active, set to `rejected`

### 2.4 Collapsible Columns
**File:** `src/components/dashboard/JobsKanbanView.tsx`
- Add `collapsedColumns` state (Set of column ids)
- Render collapsed columns as slim vertical bar with count badge
- Clicking expands inline; persist preference in localStorage
- `archive` is collapsed by default

### 2.5 Adaptive Card Layouts
**File:** `src/components/dashboard/jobs/JobKanbanCard.tsx`
- Add board-level `isExpanded` toggle
- All styling uses theme tokens
- **Collapsed:** Company, Role, Stage badge, Urgency indicator. Max 2 lines per element.
- **Expanded:** Adds Sub-Content Zone + Micro-Metrics Footer

Stage-specific card data:
| Column | Collapsed | Expanded Adds |
|---|---|---|
| `pipeline` | Company, Role, Match Score pill, Draft/Created badge | Missing keywords counter, ATS check status |
| `applied` | Company, Role, Aging pill (`Applied 3d ago`) | Application date, Follow-up countdown, Screening badge |
| `interview` | Company, Role, Next Round Countdown badge | Interviewer, Meeting link, Prep progress bar |
| `offer` | Company, Role, Base comp, Hard expiration timer | Full TC breakdown, Decision status |
| `archive` | Company, Role, Terminal status badge | Rejection reason tag or accepted start date |

Expired visual state (`flagged`): desaturated card, red warning pill, stripped CTAs.

---

## Phase 3: Sidebar Redesign (High Priority)

### 3.1 Contextual Action Ribbon
**File:** `src/components/dashboard/jobs/JobSidebar.tsx`
- Add dynamic ribbon at top of sidebar
- Primary CTA + 2 secondary actions based on active stage
- All styling uses theme tokens

Stage-specific actions:
| Stage | Primary Action | Secondary Actions |
|---|---|---|
| `draft` / `created` | Generate Tailored Docs | Find Hiring Managers (LinkedIn deep link) |
| `applied` / `screening` | Log Communication | Draft Follow-Up (AI assist) |
| `interview` | Enter Interview Prep Mode | Generate AI Prep Questions |
| `offer` | Open Negotiation Sandbox | Mark Accepted / Mark Declined |
| `rejected` / `withdrawn` / `accepted` | View Analysis | Archive / Clean Up |

### 3.2 Contextual Widgets
New files in `src/components/dashboard/jobs/widgets/`:
- `MatchScoreGapWidget.tsx` — missing keywords/skills for pipeline
- `AgingTrackerWidget.tsx` — elapsed time, ghosting risk, follow-up countdown for applied
- `InterviewPrepWidget.tsx` — logistics, cheat sheet, prep progress for interview
- `CompBreakdownWidget.tsx` — base, bonus, equity, deadline for offer
- `PostMortemWidget.tsx` — reason tags, start date for archive

### 3.3 Tab Behavior
- Existing sidebar tabs remain but are reordered/filtered per stage
- Communication tab shows unified messages (email + LinkedIn in future)
- Documents tab shows CV/CL variants for pipeline

---

## Phase 4: Fix Broken CTAs (High Priority)

### Task 4.1: Wire "Inject Data" CTA
**File:** `src/components/dashboard/jobs/stages/CreatedStageView.tsx` (lines 216–222)
- Replace `console.log('Inject Data', job.id)` with job enhancement API call
- Refresh job data on completion

### Task 4.2: Wire "Download" CTA
**File:** `src/components/dashboard/jobs/stages/CreatedStageView.tsx` (lines 223–229)
- Replace `console.log('Download', job.id)` with `handleDownload(job)` prop

### Task 4.3: Replace "Log Activity" with real form
**File:** `src/components/dashboard/jobs/stages/AppliedStageView.tsx` (lines 230–239)
- Replace `onJobClick(job)` with inline activity log form
- Update `nextFollowUpAt` on submission

### Task 4.4: Wire "Archive" to API
**File:** `src/components/dashboard/jobs/stages/RejectedStageView.tsx` (lines 46–55)
- Replace toast-only stub with `PATCH /api/jobs/[id]` `{ archived: true }`
- Remove from local state after success

### Task 4.5: Fix undo_stage_change ownership validation
**File:** `src/app/api/tracker/emails/route.ts` (lines 275–287)
- Add `jobId` to query: `{ _id: logId, userId, jobId }`

---

## Phase 5: LinkedIn Integration in Tracker (Medium Priority)

### 5.1 Deep-Link Engine
- Generate URLs: `https://www.linkedin.com/search/results/people/?keywords=recruiter%20[Company]%20[Location]`
- Add to `LinkedInJobTab.tsx` as primary action

### 5.2 Add LinkedIn tab to JobSidebar
**File:** `src/components/dashboard/jobs/JobSidebar.tsx`
- Add "LinkedIn" tab
- Render `LinkedInJobTab.tsx`

### 5.3 Create LinkedInJobTab
**New file:** `src/components/dashboard/jobs/LinkedInJobTab.tsx`
- Recruiter deep links
- Chrome Extension messaging bridge placeholder

### 5.4 Add "Import from LinkedIn" to Job Parser
**File:** `src/components/dashboard/jobs/JobParserSidebar.tsx`
- Add button for LinkedIn job import via deep link

---

## Phase 6: Stabilize Email & Communication (Medium Priority)

### Task 6.1: Stop mock email re-seeding
**File:** `src/app/api/tracker/emails/route.ts` (line 163)
- Move `seedMockEmailsIfNeeded` to one-time onboarding
- Gate on `hasSeededMockEmails` user flag

### Task 6.2: Add credit check to email AI assist
**File:** `src/app/api/tracker/emails/ai-assist/route.ts`
- Add credit/quota check before `callAIWithFallback` (line 274)

### Task 6.3: Implement email OAuth callback route
**File:** `src/app/api/tracker/emails/auth/route.ts`
- Create `/api/tracker/emails/auth/callback`
- Exchange code for tokens, store encrypted

### Task 6.4: Encrypt IMAP passwords
**File:** `src/models/TrackerEmail.ts`
- Encrypt `password` field using `token-encryption.ts`

### Task 6.5: Action Queue Coordinator
**File:** `src/lib/services/jobService.ts`
- Add debounce or `AbortController` for rapid drag-and-drop

---

## Phase 7: Level 2 Features (Medium Priority)

### Task 7.1: Semantic Resume Variant Matching
**File:** `src/components/dashboard/jobs/stages/CreatedStageView.tsx`
- Fetch `ApplicationJourney` snapshots
- Replace stub Download with variant dropdown

### Task 7.2: Automated Follow-Up Triggers
- Tie `nextFollowUpAt` to background cron or browser notification worker
- Auto-schedule "Day 7 follow-up" when job enters `applied`

### Task 7.3: Shared Message Schema Client
**New file:** `src/lib/services/unified-messages.ts`
- Define `UnifiedMessage` interface
- Refactor `CommunicationSidebar.tsx` to consume `UnifiedMessage` only

---

## Phase 8: LinkedIn Enhancer Communication (Low Priority)

### Task 8.1: Extract shared messaging client
**New file:** `src/lib/services/linkedin-messaging.ts`

### Task 8.2: Add message composer to enhancer
**File:** `src/components/linkedin-enhancer/LinkedInEnhancerDashboard.tsx`

### Task 8.3: Add conversation history viewer
**New file:** `src/components/linkedin-enhancer/LinkedInConversationViewer.tsx`

### Task 8.4: Add "Apply on LinkedIn" button
**File:** `src/components/linkedin-enhancer/LinkedInExperienceCard.tsx`

### Task 8.5: Add "Sync to tracker" button
**File:** `src/components/linkedin-enhancer/LinkedInProfileSync.tsx`

---

## Phase 9: Polish (Low Priority)

### Task 9.1: Fix LinkedIn Enhancer loading flash
**File:** `src/app/linkedin-enhancer/page.tsx` (line 116)
- Replace `if (loading) return null` with skeleton/spinner using theme tokens

### Task 9.2: Skeleton loaders
- All async state boundaries in tracker and enhancer

### Task 9.3: Error boundaries
- All stage view components

---

## Files to Modify
```
src/components/dashboard/jobs/stages/CreatedStageView.tsx
src/components/dashboard/jobs/stages/AppliedStageView.tsx
src/components/dashboard/jobs/stages/RejectedStageView.tsx
src/components/dashboard/JobsKanbanView.tsx
src/components/dashboard/JobsTracker.tsx
src/components/dashboard/jobs/JobSidebar.tsx
src/components/dashboard/jobs/JobKanbanCard.tsx
src/components/dashboard/jobs/JobParserSidebar.tsx
src/app/api/tracker/emails/route.ts
src/app/api/tracker/emails/ai-assist/route.ts
src/app/api/tracker/emails/auth/route.ts
src/models/TrackerEmail.ts
src/lib/services/jobService.ts
src/app/linkedin-enhancer/page.tsx
src/components/linkedin-enhancer/LinkedInEnhancerDashboard.tsx
src/components/linkedin-enhancer/LinkedInExperienceCard.tsx
src/components/linkedin-enhancer/LinkedInProfileSync.tsx
src/components/dashboard/jobs/CommunicationSidebar.tsx
src/app/globals.css
```

## New Files to Create
```
src/utils/tracker-expiry.ts
src/components/dashboard/jobs/stages/config/stageActions.tsx
src/components/dashboard/jobs/LinkedInJobTab.tsx
src/components/dashboard/jobs/widgets/MatchScoreGapWidget.tsx
src/components/dashboard/jobs/widgets/AgingTrackerWidget.tsx
src/components/dashboard/jobs/widgets/InterviewPrepWidget.tsx
src/components/dashboard/jobs/widgets/CompBreakdownWidget.tsx
src/components/dashboard/jobs/widgets/PostMortemWidget.tsx
src/lib/services/linkedin-messaging.ts
src/lib/services/unified-messages.ts
src/app/api/tracker/linkedin/recruiters/route.ts
src/app/api/tracker/linkedin/message/route.ts
src/app/api/tracker/linkedin/conversations/route.ts
src/app/api/tracker/linkedin/sync-status/route.ts
src/app/api/tracker/linkedin/job-search/route.ts
src/components/linkedin-enhancer/LinkedInConversationViewer.tsx
```

---

## Appendix: Design Context from plan_context.md

The kanban compression and sidebar redesign follow the design spec in `plan_context.md`. Key principles:
- **Progressive disclosure:** Show data only when relevant to current stage
- **Contextual intent:** Surface high-priority actions matching job state
- **5 core columns:** Pipeline (draft+created), Applied (applied+screening), Interview, Offer, Archive (rejected+withdrawn+accepted)
- **Archive column:** Collapsed by default, expands inline
- **Contextual Action Ribbon:** Primary CTA morphs by stage, flanked by secondary actions
- **48h grace period:** Expired offers/interviews show flagged state before auto-archive
- **Adaptive cards:** Collapsed = minimal info; Expanded = sub-content zone + micro-metrics footer