To streamline your Kanban stages and ensure the Job Sidebar serves as an actionable command center rather than a static data dump, we need to apply two core design philosophies: **progressive disclosure** (showing data only when it is relevant to the current stage) and **contextual intent** (surfacing high-priority actions matching the job's current state).

# A. Here is the blueprint to re-engineer your stages and sidebar for maximum utility.

---

## 1. Streamlining the Kanban Stages (The "Active Pipeline" Pivot)

Expanding your board to 9 columns creates cognitive overload. Instead, compress your layout into **5 core active phases**, using **sub-states** inside the columns to manage secondary steps.

### The Compressed Stage Matrix

| Core Column | Handled Sub-Statuses | Visual Strategy | Primary Column Goal |
| --- | --- | --- | --- |
| **1. Pipeline** | `draft`, `created` | Split internally by a subtle horizontal divider or toggle tabs at the top of the column. | Move from a raw job link to a generated, tailored CV/CL packet. |
| **2. Applied** | `applied`, `screening` | `screening` behaves as an automated sub-tag or badge on the card rather than a separate column. | Track response times and trigger active follow-ups. |
| **3. Interview** | `interview` | Show explicit multi-round indicators on the card (e.g., "Round 2 of 4"). | Centralize prep work, logistics, and mock review links. |
| **4. Decision** | `offer` | Highlight with a distinct border or subtle color treatment. | Evaluate compensation, track deadlines, and launch negotiations. |
| **5. Archive** | `rejected`, `withdrawn`, `accepted` | **Folded/Collapsed by default.** Displays as a single skinny vertical bar on the far right. Clicking expands it. | Post-mortem analysis, metrics logging, or clean up. |

---

## 2. Transforming the Job Sidebar into an Actionable Command Center

The current `JobSidebar.tsx` relies on standard tabs (Details, Communication, etc.). To make it truly actionable, replace the static top-level elements with a dynamic **"Contextual Action Ribbon"** and an **"AI Next-Best-Step"** widget that morphs based on the job stage.

### 2.1 The Contextual Action Ribbon

The top of your sidebar should always feature a single, high-contrast primary call-to-action (CTA) matching the candidate's exact needs at that moment, flanked by two secondary actions.

```
+--------------------------------------------------------+
|  [STAGE: APPLIED] Google - Senior Frontend Engineer   |
|                                                        |
|  +--------------------------------------------------+  |
|  | ⚡ PRIMARY ACTION: Log Recruiter Outreach        |  |
|  +--------------------------------------------------+  |
|    [Secondary: Generate Follow-up]   [View App Docs]   |
+--------------------------------------------------------+

```

### 2.2 Stage-Specific Information & Action Mapping

Configure your sidebar to render custom sub-components dynamically using a pattern matching the active stage:

#### When Stage is `draft` or `created`

* **Focus Shift:** Preparation & Alignment.
* **Actionable Info Card:** Surface the **AI Match Score Gap**. Don’t just show "85%". List the exact 3 missing keywords or missing framework skills needed to bump the score.
* **Primary Action:** `Generate Tailored Assets` (Triggers CV/CL engine).
* **Secondary Action:** `Deep Link: Find Hiring Team` (Launches the LinkedIn search URL engine).

#### When Stage is `applied` or `screening`

* **Focus Shift:** Velocity & Momentum.
* **Actionable Info Card:** Surface an **"Elapsed Time / Ghosting Risk" tracker**. (e.g., *"Applied 9 days ago. Average response time for this company is 12 days."*).
* **Primary Action:** `Log Communication` (Quick-inject an email or LinkedIn message template to your history stack).
* **Secondary Action:** `Draft 1-Week Follow-Up` (Opens AI assist with a pre-composed follow-up prompt).

#### When Stage is `interview`

* **Focus Shift:** Execution & Preparation.
* **Actionable Info Card:** **Logistics & Cheat Sheets.** Display the date, meeting link, interviewer names, and an embedded checklist of the company's core engineering values or architectural patterns.
* **Primary Action:** `Enter Interview Prep Mode` (Launches full-screen behavior script or notes utility).
* **Secondary Action:** `Generate AI Prep Questions` (Feeds the job description and your resume into Gemini to spin up custom technical mock questions).

#### When Stage is `offer`

* **Focus Shift:** Closing & Valuation.
* **Actionable Info Card:** **Total Compensation Breakdown.** Display a micro-table calculating Base + Bonus + Equity Value alongside the hard decision deadline.
* **Primary Action:** `Open Negotiation Sandbox` (Launches an interactive tool or script framework to draft counter-proposals).
* **Secondary Action:** `Mark Accepted` / `Mark Declined`.

---

## 3. Recommended Code Architecture for `JobSidebar.tsx`

To cleanly implement this without creating a massive, unmaintainable component file, break out your stage actions into a polymorphic map config.

```typescript
// src/components/dashboard/jobs/config/stageActions.tsx

export interface StageActionConfig {
  primaryAction: {
    label: string;
    icon: string;
    onClick: (job: JobApplication) => void;
  };
  secondaryActions: Array<{
    label: string;
    onClick: (job: JobApplication) => void;
  }>;
  renderContextualWidget: (job: JobApplication) => React.ReactNode;
}

export const STAGE_ACTION_MAP: Record<string, StageActionConfig> = {
  draft: {
    primaryAction: {
      label: "Generate Tailored Docs",
      icon: "sparkles",
      onClick: (job) => triggerDocGeneration(job.id),
    },
    secondaryActions: [
      { label: "Find Hiring Managers", onClick: (job) => openLinkedInSearch(job.company) }
    ],
    renderContextualWidget: (job) => <MatchScoreGapWidget jobId={job.id} />
  },
  applied: {
    primaryAction: {
      label: "Log Communication",
      icon: "message-square",
      onClick: (job) => openCommunicationDrawer(job.id),
    },
    secondaryActions: [
      { label: "Draft Follow-Up", onClick: (job) => openAiEmailAssist(job.id) }
    ],
    renderContextualWidget: (job) => <AgingTrackerWidget appliedAt={job.appliedAt} />
  }
  // Add interview, offer, etc...
};

To maximize scannability on your Kanban board, job cards should adapt dynamically based on two vectors: **sizing context (collapsed vs. expanded layout)** and **pipeline intent (the specific stage the job is in)**.

When a card is clicked, the sidebar opens to handle heavy interactions—meaning the card's sole job is to signal **urgency, next steps, and state updates** at a single glance.


# B. Here is how to structure the card configurations to keep your board clean yet highly informative.

---

## 1. Structural Baselines: Collapsed vs. Expanded Layouts

Before layer-stitching stage data, establish your card wrappers.

### Collapsed State (Default Card Grid)

The default view must prioritize a strict vertical footprint so columns don't stretch indefinitely.

* **Layout Structure:** A tightly packed layout featuring the **Company Logo/Name**, **Role Title**, a single high-signal **Stage Badge**, and an **Urgency Indicator** (such as a time pill or critical warning).
* **Rule of Thumb:** Keep text to exactly 2 lines maximum per element; hide all sub-property descriptions.

### Expanded State (Detailed Grid Toggle) on hover.

When a user toggles an "Expanded Cards" view across the board (useful for weekly pipeline reviews), the cards expand vertically to expose critical execution data.

* **Layout Structure:** Appends a structured **Sub-Content Zone** and **Micro-Metrics Footer** directly below the basic layout.
* **Rule of Thumb:** Show absolute dates, exact monetary or metric tallies, and progress indicators (like round steps or match gaps).

---

## 2. Stage-Specific Adaptive Card Blueprints

Here is the exact information matrix tailored specifically to each of your compressed pipeline phases.

### 2.1 Pipeline Stage (`draft` + `created` sub-statuses)

* **Focus:** Actionability of asset creation and optimization gap.
* **Data Layout:**
* **Collapsed View:** Company, Role, Match Score Pill (e.g., `84% Match`), and a `Draft` or `Created` sub-status indicator badge.
* **Expanded View Adds:**
* An explicit **Missing Keywords Counter** (e.g., *“Missing: Next.js, Redis”*).
* An **ATS Check Status** marker showing whether documents have been generated yet.





### 2.2 Applied Stage (`applied` + `screening` sub-statuses)

* **Focus:** Time tracking, stagnation risk, and incoming outreach channels.
* **Data Layout:**
* **Collapsed View:** Company, Role, and an **Aging Pill** that dynamically changes style based on elapsed time (e.g., `Applied 3d ago` [Neutral Green] vs. `Applied 14d ago` [Warning Amber]).
* **Expanded View Adds:**
* The exact calendar application date.
* A **Follow-up Countdown** or indicator (e.g., *“Follow-up due in 2 days”*).
* A `Screening Scheduled` indicator if a phone screen is logged.





### 2.3 Interview Stage (`interview`)

* **Focus:** Preparation state and timeline urgency.
* **Data Layout:**
* **Collapsed View:** Company, Role, and a highly visible **Next Round Countdown Badge** (e.g., `Tech Round Tomorrow` [Urgent Red] or `Round 3 in 4 days`).
* **Expanded View Adds:**
* Interviewer names and an direct-click **Meeting Link Icon** shortcut.
* An **Interview Prep Progress Tracker** mapping completed mock sections (e.g., structured as a micro-progress bar: `2/5 Prep Tasks Done`).





### 2.4 Decision Stage (`offer`)

* **Focus:** Compensation visibility and deadline hard-stops.
* **Data Layout:**
* **Collapsed View:** Company, Role, and **Base Compensation** (e.g., `$145k`), plus a **Hard Expiration Timer** (e.g., `Expires in 48h`).
* **Expanded View Adds:**
* Full Total Compensation breakdown snapshot (Base + Bonus + Equity, e.g., `$145k / $15k / $40k`).
* A progress indicator showing decision statuses (`Reviewing Counter` or `Awaiting Sign-off`).





### 2.5 Archive Stage (`rejected`, `withdrawn`, `accepted`)

* **Focus:** Post-mortem summary insights or win metrics.
* **Data Layout:**
* **Collapsed View:** Company, Role, and a definitive Terminal Status Badge (`Accepted` [Neon Green Glow], `Rejected` [Muted Gray], `Withdrawn` [Strike-through Text]).
* **Expanded View Adds:**
* For Rejections: The primary analyzed **Reason Tag** surfaced by your insights engine (e.g., *“Reason: Headcount Freeze”*).
* For Accepted: Finalized start date milestone.





---

## 3. Visual Layout Reference

Here is a visual structural mapping of how a card under the **Interview Stage** layout transforms between states.

```
===========================================================
[COLLAPSED STATE: INTERVIEW STAGE]
+---------------------------------------------------------+
| (Logo)  Stripe                                          |
|         Staff Data Analyst                              |
|                                                         |
| [Tech Round: July 9th]             [! Urgent: Tomorrow] |
+---------------------------------------------------------+

===========================================================
[EXPANDED STATE: INTERVIEW STAGE]
+---------------------------------------------------------+
| (Logo)  Stripe                                          |
|         Staff Data Analyst                              |
|                                                         |
| [Tech Round: July 9th]             [! Urgent: Tomorrow] |
| ------------------------------------------------------- |
|  Logistics:  3:00 PM IST | 45 Mins                      |
|  Panel:      Sarah Jenkins (Principal Architect)        |
|  Link:       [Join Zoom meeting short-link]             |
|                                                         |
|  Prep State: [|||||||||||||||......] 60% Complete       |
+---------------------------------------------------------+

```

# C. Here is the professional workflow strategy to handle expired jobs cleanly without losing their data.

---

## 1. The Recommended Flow: Auto-Archiving with a "Grace Period"

Instead of an immediate, jarring disappearance, use a **two-phase expiration flow** that balances visual cleanliness with a safety net for the user.

```
[Active Stage] ──(Deadline Passes)──► [Flagged as Expired] ──(48h Grace Period)──► [Auto-Moved to Archive]

```

### Phase 1: The "Flagged" State (Max 48 Hours)

When a hard deadline passes (e.g., an offer expiration date or a scheduled interview time without a logged outcome), **keep the card in its current column for exactly 48 hours**, but mutate its visual state completely:

* **The Look:** desaturate the card (gray it out), strip out the normal CTAs, and overlay a prominent red warning banner: `⚠️ Expired [Time Ago]`.
* **The Purpose:** This acts as a safety buffer. If the user simply forgot to log an update or managed to get an extension, they can resolve it immediately right where they expect to find it.

### Phase 2: The "Auto-Archive" State (After 48 Hours)

If the user takes no action within 48 hours, the system automatically runs a background update or filtering rule that clears the card from the active board and shifts it to the **Archive Column** under the specific sub-status `withdrawn` or `rejected` (depending on whether it was a missed offer or a missed application deadline), tagged as `System Expired`.

---

## 2. Card Visual Layouts for Expired States

When a card is in that temporary 48-hour active-column expired state, change its layout to force user correction.

### Collapsed Expired Card

* **The Look:** The background drops to a muted background opacity, text color shifts to a lower contrast gray, and a bright red warning pill replaces the typical stage metric.

```
+---------------------------------------------------------+
|  Stripe                                                 |
|  Staff Data Analyst                                     |
|                                                         |
|  [⚠️ Offer Expired 12h ago]                             |
+---------------------------------------------------------+

```

### Expanded Expired Card

* **The Look:** Exposes a clear, high-contrast remediation section at the bottom. **Never leave an expired card without a quick-fix action.**

```
+---------------------------------------------------------+
|  Stripe                                                 |
|  Staff Data Analyst                                     |
|                                                         |
|  [⚠️ Offer Expired 12h ago]                             |
| ------------------------------------------------------- |
|  This offer reached its deadline on July 4, 2026.       |
|                                                         |
|  [ Update Status / Log Extension ]   [ Move to Archive ]|
+---------------------------------------------------------+

```

---

## 3. Technical Implementation Strategy

To handle this efficiently without running heavy database crons every minute, compute the expiration state **on the fly** in your frontend selector or database query using virtual fields.

### Step 1: Add an Expiration Evaluator Utility

Create a clean utility function to calculate whether a job application has passed its actionable window.

```typescript
// src/utils/tracker-expiry.ts

export type ExpiryState = 'active' | 'flagged' | 'archivable';

export function getJobExpiryState(job: JobApplication): ExpiryState {
  let deadline: Date | null = null;

  if (job.status === 'offer' && job.offerStage?.deadline) {
    deadline = new Date(job.offerStage.deadline);
  } else if (job.status === 'interview' && job.interviewStage?.date) {
    // If an interview date is more than 24 hours in the past with no notes or status change
    deadline = new Date(job.interviewStage.date);
  }

  if (!deadline) return 'active';

  const now = new Date();
  const msPastDeadline = now.getTime() - deadline.getTime();

  if (msPastDeadline <= 0) return 'active';
  
  // 48 hours in milliseconds = 172,800,000
  const GRACE_PERIOD = 48 * 60 * 60 * 1000; 
  return msPastDeadline < GRACE_PERIOD ? 'flagged' : 'archivable';
}

```

### Step 2: Streamline Your Kanban Grouping Selector

Modify the logic that slices your jobs array into columns (`jobsByStatus`). If a job returns `'archivable'`, automatically route it to the collapsed `Archive` stack, even if its raw database status is still set to `offer` or `interview`.

```typescript
// src/components/dashboard/JobsTracker.tsx

const useKanbanPipelines = (jobs: JobApplication[]) => {
  return useMemo(() => {
    const grouped = {
      pipeline: [],
      applied: [],
      interview: [],
      offer: [],
      archive: []
    };

    jobs.forEach(job => {
      const expiry = getJobExpiryState(job);

      // Rule: If it's fully archivable or already manually archived, force it to Archive column
      if (expiry === 'archivable' || ['rejected', 'withdrawn', 'accepted'].includes(job.status)) {
        grouped.archive.push(job);
      } else {
        // Map active or temporarily flagged jobs to their native columns
        if (['draft', 'created'].includes(job.status)) grouped.pipeline.push(job);
        else if (['applied', 'screening'].includes(job.status)) grouped.applied.push(job);
        else if (job.status === 'interview') grouped.interview.push(job);
        else if (job.status === 'offer') grouped.offer.push(job);
      }
    });

    return grouped;
  }, [jobs]);
};

```

This structural architecture ensures your active columns stay perfectly clean, while giving users a clear, explicit 48-hour warning window to change or rescue records directly from the main dashboard dashboard view before they get cleaned out.

# D. Move them out of the active pipeline. Keeping expired jobs as gray cards in their current stage ruins your Kanban board's primary function: showing you **where your active momentum is**.

If you leave an expired offer in the "Decision" column, it creates false clutter, skews your pipeline metrics, and dilutes the urgency of offers that are actually live.

Here is the professional workflow strategy to handle expired jobs cleanly without losing their data.

---

## 1. The Recommended Flow: Auto-Archiving with a "Grace Period"

Instead of an immediate, jarring disappearance, use a **two-phase expiration flow** that balances visual cleanliness with a safety net for the user.

```
[Active Stage] ──(Deadline Passes)──► [Flagged as Expired] ──(48h Grace Period)──► [Auto-Moved to Archive]

```

### Phase 1: The "Flagged" State (Max 48 Hours)

When a hard deadline passes (e.g., an offer expiration date or a scheduled interview time without a logged outcome), **keep the card in its current column for exactly 48 hours**, but mutate its visual state completely:

* **The Look:** desaturate the card (gray it out), strip out the normal CTAs, and overlay a prominent red warning banner: `⚠️ Expired [Time Ago]`.
* **The Purpose:** This acts as a safety buffer. If the user simply forgot to log an update or managed to get an extension, they can resolve it immediately right where they expect to find it.

### Phase 2: The "Auto-Archive" State (After 48 Hours)

If the user takes no action within 48 hours, the system automatically runs a background update or filtering rule that clears the card from the active board and shifts it to the **Archive Column** under the specific sub-status `withdrawn` or `rejected` (depending on whether it was a missed offer or a missed application deadline), tagged as `System Expired`.

---

## 2. Card Visual Layouts for Expired States

When a card is in that temporary 48-hour active-column expired state, change its layout to force user correction.

### Collapsed Expired Card

* **The Look:** The background drops to a muted background opacity, text color shifts to a lower contrast gray, and a bright red warning pill replaces the typical stage metric.

```
+---------------------------------------------------------+
|  Stripe                                                 |
|  Staff Data Analyst                                     |
|                                                         |
|  [⚠️ Offer Expired 12h ago]                             |
+---------------------------------------------------------+

```

### Expanded Expired Card

* **The Look:** Exposes a clear, high-contrast remediation section at the bottom. **Never leave an expired card without a quick-fix action.**

```
+---------------------------------------------------------+
|  Stripe                                                 |
|  Staff Data Analyst                                     |
|                                                         |
|  [⚠️ Offer Expired 12h ago]                             |
| ------------------------------------------------------- |
|  This offer reached its deadline on July 4, 2026.       |
|                                                         |
|  [ Update Status / Log Extension ]   [ Move to Archive ]|
+---------------------------------------------------------+

```

---

## 3. Technical Implementation Strategy

To handle this efficiently without running heavy database crons every minute, compute the expiration state **on the fly** in your frontend selector or database query using virtual fields.

### Step 1: Add an Expiration Evaluator Utility

Create a clean utility function to calculate whether a job application has passed its actionable window.

```typescript
// src/utils/tracker-expiry.ts

export type ExpiryState = 'active' | 'flagged' | 'archivable';

export function getJobExpiryState(job: JobApplication): ExpiryState {
  let deadline: Date | null = null;

  if (job.status === 'offer' && job.offerStage?.deadline) {
    deadline = new Date(job.offerStage.deadline);
  } else if (job.status === 'interview' && job.interviewStage?.date) {
    // If an interview date is more than 24 hours in the past with no notes or status change
    deadline = new Date(job.interviewStage.date);
  }

  if (!deadline) return 'active';

  const now = new Date();
  const msPastDeadline = now.getTime() - deadline.getTime();

  if (msPastDeadline <= 0) return 'active';
  
  // 48 hours in milliseconds = 172,800,000
  const GRACE_PERIOD = 48 * 60 * 60 * 1000; 
  return msPastDeadline < GRACE_PERIOD ? 'flagged' : 'archivable';
}

```

### Step 2: Streamline Your Kanban Grouping Selector

Modify the logic that slices your jobs array into columns (`jobsByStatus`). If a job returns `'archivable'`, automatically route it to the collapsed `Archive` stack, even if its raw database status is still set to `offer` or `interview`.

```typescript
// src/components/dashboard/JobsTracker.tsx

const useKanbanPipelines = (jobs: JobApplication[]) => {
  return useMemo(() => {
    const grouped = {
      pipeline: [],
      applied: [],
      interview: [],
      offer: [],
      archive: []
    };

    jobs.forEach(job => {
      const expiry = getJobExpiryState(job);

      // Rule: If it's fully archivable or already manually archived, force it to Archive column
      if (expiry === 'archivable' || ['rejected', 'withdrawn', 'accepted'].includes(job.status)) {
        grouped.archive.push(job);
      } else {
        // Map active or temporarily flagged jobs to their native columns
        if (['draft', 'created'].includes(job.status)) grouped.pipeline.push(job);
        else if (['applied', 'screening'].includes(job.status)) grouped.applied.push(job);
        else if (job.status === 'interview') grouped.interview.push(job);
        else if (job.status === 'offer') grouped.offer.push(job);
      }
    });

    return grouped;
  }, [jobs]);
};

```

This structural architecture ensures your active columns stay perfectly clean, while giving users a clear, explicit 48-hour warning window to change or rescue records directly from the main dashboard dashboard view before they get cleaned out.