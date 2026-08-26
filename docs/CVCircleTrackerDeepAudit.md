AIResume Tracker Deep Audit — Issues & Legacy Usage
Scope: src/components/dashboard/jobs/, src/app/dashboard/tracker/, and tracker-related utilities
Date: 2026-07-14

🔴 CRITICAL / RUNTIME-BREAKING
1. JobApplication interface duplicated across 10+ files
Files: JobsTracker.tsx, JobSidebar.tsx, EditJobSidebar.tsx, JobsListView.tsx, JobsKanbanView.tsx, JobKanbanCard.tsx, JobSidebar.tsx, plus 6 stage view files
Each file defines its own interface JobApplication with slight variations. This causes:

Type drift when one copy adds a field and another doesn't
Props typed as any to bypass mismatches (e.g., JobsKanbanView.tsx:200 casts job as any)
No single source of truth for the job schema
Fix: Extract to src/types/job.ts and import everywhere. Remove all local copies.

2. localStorage accessed without SSR/SSR guard
Files:

TrackerOnboarding.tsx:963,972 — reads/writes localStorage in useEffect without typeof window !== 'undefined' guard inside the effect body
JobsKanbanView.tsx:305,325 — same pattern for kanban-collapsed-columns
If any of these components ever render on the server or during hydration, localStorage throws ReferenceError: localStorage is not defined.

Fix: Wrap every localStorage access in if (typeof window !== 'undefined') and add try/catch.

3. isFollowUpNeeded logic is always true for days >= 7
File: JobSidebar.tsx:736-751 and JobsKanbanView.tsx:399-405

case 'applied':
  return days >= 3 || days >= 7;
days >= 3 || days >= 7 is equivalent to days >= 3. The >= 7 branch is dead code. If the intent was "show after 3 days, but especially after 7", this is misleading. If the intent was "show at 3 OR 7 days but not both", this is a logic bug.

Fix: Clarify the rule, e.g., days >= 3 && days <= 7 or use separate timers.

4. JobSidebar.tsx:168-193 useEffect dependency on job object causes infinite re-renders
useEffect(() => {
  if (isEditingDetails) {
    setEditJobTitle(job.jobTitle || '');
    // ... 15 more setState calls
  }
}, [isEditingDetails, job]);
job is a new object reference on every parent render. This effect runs on every render, even when isEditingDetails is false and nothing changed. Combined with 15+ state setters, this causes unnecessary re-renders.

Fix: Use useMemo for the derived edit state, or remove job from deps and use a ref to track changes.

5. JobSidebar.tsx:1463-1593 handleCreateJourney race condition
const existingJourney = journeys.find(j => j.jobId === currentJobId);
if (existingJourney) { ... }
journeys is loaded asynchronously via loadJourneysForJob(). If the user clicks "Create Journey" before loadJourneysForJob completes, journeys is empty and the code proceeds to create a duplicate journey.

Fix: Add a loadingJourneys guard: if loadingJourneys is true, show a loading state and disable the button.

6. EditJobSidebar.tsx and JobsListView.tsx use // @ts-nocheck
Files: EditJobSidebar.tsx:1, JobsListView.tsx:1
This suppresses all TypeScript checking in these files, hiding real type errors.

Fix: Remove @ts-nocheck and fix the underlying type issues. Import the shared JobApplication type.

🟠 HIGH — DATA INTEGRITY / LOGIC
7. Credit error handling duplicated 4+ times with slight variations
Locations:

JobsTracker.tsx:1221-1260 (drag-and-drop)
JobsTracker.tsx:951-970 (moveDraftJobToCreated)
JobSidebar.tsx:1655-1681 (executeMoveToCreated)
JobSidebar.tsx:1524-1538 (inline in handleCreateJourney)
Each block checks errorData.error?.includes('limit exceeded') etc. but with different fallback paths. This leads to inconsistent paywall behavior.

Fix: Extract to a single handleCreditError(errorData, context) utility.

8. loadTrackerGenerationPreview duplicated in JobsTracker.tsx and JobSidebar.tsx
Both components have identical logic for fetching /api/jobs/tracker-generation-preview and normalizing the response. This is dead code duplication.

Fix: Extract to src/lib/utils/tracker-generation-preview.ts and import in both.

9. JobSidebar.tsx is a 3682-line god component
File: JobSidebar.tsx (3682 lines)
Contains: notes CRUD, contacts CRUD, email sending, journey creation, document preview, follow-up timeline, stage transitions, CV loading, paywall handling, and more.

Fix: Split into:

JobDetailsPanel.tsx (edit form)
JobNotesPanel.tsx (notes CRUD)
JobContactsPanel.tsx (contacts CRUD)
JobCommunicationPanel.tsx (email)
JobJourneysPanel.tsx (journey cards)
JobDocumentPreview.tsx (CV/CL preview)
10. EditJobSidebar.tsx hardcodes getDateString(15) for deadline default
File: EditJobSidebar.tsx:163-167, 303

const getDateString = (daysFromNow: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0];
};
// ...
deadline: getDateString(15), // Default to 15 days from now

10. EditJobSidebar.tsx hardcodes getDateString(15) for deadline default
File: EditJobSidebar.tsx:163-167, 303

const getDateString = (daysFromNow: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0];
};
// ...
deadline: getDateString(15), // Default to 15 days from now
This logic is duplicated from JobSidebar.tsx:163-167. Both components define the same helper. More importantly, 15 days is arbitrary and not configurable.

Fix: Extract to src/lib/utils/job-deadline.ts and make the default days configurable per company policy.

11. JobsKanbanView.tsx defines its own JobApplication interface
File: JobsKanbanView.tsx:40-86 A full duplicate of the JobApplication type, plus an offerDetails field that doesn't exist in other copies. This forces callers to cast job as any when passing data between views.

Fix: Import the shared type from src/types/job.ts. Remove the local interface and the as any casts at lines 193, 200-213.

12. JobKanbanCard.tsx also defines its own JobApplication interface
File: JobKanbanCard.tsx:31 Third copy of the same interface. Props like job are typed with this local copy, so if the parent passes a differently-shaped object, TypeScript won't catch it.

Fix: Same as #11 — import shared type.

13. Each stage view file (DraftStageView, CreatedStageView, etc.) defines its own JobApplication
Files:

stages/DraftStageView.tsx:7
stages/CreatedStageView.tsx:8
stages/AppliedStageView.tsx:8
stages/InterviewStageView.tsx:8
stages/OfferStageView.tsx:8
stages/RejectedStageView.tsx:8
Six more copies. This is the same type drift problem as #1, spread across every kanban stage component.

Fix: Import shared JobApplication type. Remove local interfaces.

14. JobsKanbanView.tsx ExpiredJobsAccordion passes hardcoded empty callbacks to JourneyTimelineCard
File: JobsKanbanView.tsx:492-517

<JourneyTimelineCard
  journey={jobJourneys[0]}
  onResume={() => {}}
  onDownload={() => {}}
  onDelete={() => {}}
  onRefresh={() => {}}
  onUpdateJourney={() => {}}
/>
All action callbacks are no-ops. If the user clicks any action inside the expired accordion, nothing happens. This is a silent UX bug — the buttons appear clickable but are dead.

Fix: Either wire the callbacks to the parent handlers (onCreateJourney, onImproveATS, onDownload, onRefresh) or hide the action buttons in the expired accordion.

15. JobSidebar.tsx handleCreateJourney and executeMoveToCreated duplicate the same API call
Files: JobSidebar.tsx:1463-1593 and 1630-1719 Both functions:

PUT /api/jobs/${jobId} with { status: 'created' }
Parse the same error shape
Show the same toast message
Call onRefresh() on success
The only difference is that executeMoveToCreated is called from a button in the sidebar details panel, while handleCreateJourney is called from the journey creation flow.

Fix: Extract moveJobToCreated(jobId, userId) to a shared utility. Both callers should use it.

16. JobSidebar.tsx loadJourneysForJob is called redundantly
File: JobSidebar.tsx:636-659, 706-710 loadJourneysForJob is called:

Inside useEffect at line 706 whenever user?.id or job?.id changes
Inside handleCreateJourney at line 1580 after journey creation
The journeys state is also passed as initialJourneys prop, creating a dual-source-of-truth
If the parent JobsTracker also loads journeys, there are three competing sources. The useEffect at line 706 fires on every job?.id change, causing redundant fetches.

Fix: Remove the useEffect-based auto-load. Let the parent (JobsTracker) own journey loading and pass journeys down via props.

17. handleJobSaved in JobsTracker.tsx uses stale editingJob reference
File: JobsTracker.tsx:784-789

const handleJobSaved = (job: any) => {
  setShowAddJobModal(false);
  setEditingJob(null);
  loadData();
  toast.success(editingJob ? 'Job updated successfully!' : 'Job added successfully!');
};
editingJob is read from the closure at the time handleJobSaved was created. If setEditingJob(null) has already been called or the user rapidly opens another edit modal, editingJob may be stale, causing the wrong toast message.

Fix: Use a ref or derive the message from the job argument:

toast.success(job.id ? 'Job updated successfully!' : 'Job added successfully!');
18. useJobsKeyboardShortcuts hook captures stale viewMode
File: JobsTracker.tsx:827-848

useJobsKeyboardShortcuts({
  onToggleView: () => handleViewModeChange(viewMode === 'kanban' ? 'list' : 'kanban'),
  // ...
  enabled: !showModal && !showAddJobModal
});
If the hook captures viewMode at mount time and doesn't update its closure, pressing the shortcut toggles to the wrong view. The enabled flag also doesn't react to showModal changes if the hook uses a stale closure.

Fix: Ensure useJobsKeyboardShortcuts uses useRef for callback identities or re-registers listeners when deps change.

19. TrackerOnboarding.tsx uses localStorage without typeof window guard
File: TrackerOnboarding.tsx:963,972

const seen = localStorage.getItem('cvcircle_tracker_onboarding_seen');
// ...
localStorage.setItem('cvcircle_tracker_onboarding_seen', 'true');
Inside a useEffect, but if the component ever renders during SSR or in a webview without localStorage, it crashes. The fetch failure path at line 963 is the trigger.

Fix:

if (typeof window !== 'undefined') {
  const seen = localStorage.getItem('cvcircle_tracker_onboarding_seen');
  if (!seen) setIsOpen(true);
}
20. JobSidebar.tsx getEmailTemplate interpolates user data without sanitization
File: JobSidebar.tsx:878-946

const getEmailTemplate = (job: JobApplication) => {
  const userName = getUserName();
  // ...
  return `Dear ${contactName},
  // ...
  Best regards,
  ${userName}`;
};
userName, contactName, job.jobTitle, and job.company are interpolated directly into a mailto: body. If any of these contain characters like &, ?, or line breaks, the mailto: URI becomes malformed or injects additional headers.

Fix: Encode with encodeURIComponent:

const body = encodeURIComponent(`Dear ${contactName},\n\n...`);
The current code does encode at line 814, but getEmailTemplate returns raw text that is later encoded. If the template is ever rendered as HTML elsewhere (e.g., in an email preview pane), it's unescaped.

🟡 MEDIUM — UX / EDGE CASES
21. JobsKanbanView.tsx stage headers use onMouseEnter/onMouseLeave to swap entire className strings
File: JobsKanbanView.tsx:464-469

onMouseEnter={(e) => {
  e.currentTarget.className = `p-3 rounded-xl border-2 border-solid ${stage.hoverColor} ...`;
}}
onMouseLeave={(e) => {
  e.currentTarget.className = `p-3 rounded-xl border-2 border-solid ${stage.color} ...`;
}}
This bypasses React's virtual DOM and directly mutates the DOM node. It breaks SSR hydration, causes layout thrashing, and drops event listeners if the element is recycled.

Fix: Use React state: const [isHovered, setIsHovered] = useState(false) and compute className from isHovered.

22. JobSidebar.tsx isFollowUpNeeded is called inside useMemo but depends on job object
File: JobSidebar.tsx:736-751, 1288

const followUpTimeline = useMemo(() => getFollowUpTimeline(job), [job]);
getFollowUpTimeline calls isFollowUpNeeded internally. If job is a new reference on every render (which it is, since it comes from the parent), this useMemo never memoizes and runs on every render.

Fix: Memoize job in the parent or derive followUpTimeline from specific primitive deps (job.status, job.updatedAt, job.deadline).

23. JobSidebar.tsx parseNotes regex is brittle
File: JobSidebar.tsx:237-267

const regex = /---\s*([^\s]+)\s*---\n([\s\S]*?)(?=(?:---\s*[^\s]+\s*---|$))/g;
This regex requires exact --- DATE --- format with no variation. If a user's note contains --- in the body text, it splits incorrectly. There's also no length limit, so a 1MB note will block the UI.

Fix: Use a structured format (JSON lines or a proper delimiter) or add a max-length guard before parsing.

24. JobsKanbanView.tsx localStorage.setItem has empty catch block
File: JobsKanbanView.tsx:324-328

try {
  localStorage.setItem('kanban-collapsed-columns', JSON.stringify([...next]));
} catch {
  // ignore storage errors
}
Silently ignoring storage errors means the user's column preferences are lost with no feedback. If localStorage is full or disabled, the UI silently reverts to default on every toggle.

Fix: At minimum, log the error: console.warn('Failed to save kanban state:', err). Better: fall back to sessionStorage or in-memory state.

25. JobSidebar.tsx handleSaveDetails calls onRefresh() without awaiting it
File: JobSidebar.tsx:410-414

if (res.ok) {
  toast.success('Job details updated successfully!');
  setIsEditingDetails(false);
  onRefresh();
}
onRefresh is async (it calls loadData() in the parent). Not awaiting it means the sidebar can close before the refresh completes, causing a stale UI flash if the user reopens it quickly.

Fix: await onRefresh();

🟢 LOW / LEGACY / CLEANUP
26. TrackerOnboarding.tsx.bak backup file in source tree
File: src/components/dashboard/jobs/TrackerOnboarding.tsx.bak Backup files should not be committed to the repository.

Fix: Delete .bak file and ensure it's in .gitignore.

27. JobsTracker.tsx limitInfo returns null for unlimited plans but callers check limitInfo && !limitInfo.hasTrackerAccess
File: JobsTracker.tsx:134-155, 609-628 For unlimited plans, limitInfo is null. The check if (limitInfo && !limitInfo.hasTrackerAccess) correctly skips the block, but the pattern is repeated 4 times in the file. If a developer adds a new call site and forgets the limitInfo null guard, it crashes.

Fix: Normalize limitInfo to always return an object, or extract a canAccessTracker helper.

28. JobsKanbanView.tsx isFollowUpNeeded logic is duplicated from JobSidebar.tsx
File: JobsKanbanView.tsx:399-405 Exact copy of JobSidebar.tsx:736-751, including the days >= 3 || days >= 7 bug from #3. Two copies of the same bug means two places to fix it.

Fix: Extract to src/lib/utils/job-intelligence.ts and import in both.

29. JobSidebar.tsx getEmailSubject is duplicated in JobsKanbanView.tsx
File: JobsKanbanView.tsx:421-436 builds a mailto: subject inline with the same logic as JobSidebar.tsx:767-784. Same strings, same status mapping.

Fix: Extract getFollowUpEmailSubject(jobStatus, jobTitle, company) to a shared utility.

30. JobSidebar.tsx stageItems memoizes with getStageTransitionDate in deps
File: JobSidebar.tsx:1325-1366

const stageItems = useMemo(() => { ... }, [getStageTransitionDate, job.status]);
getStageTransitionDate is a useCallback with [job.createdAt, job.status, job.statusHistory, job.updatedAt] deps. Including it in the useMemo deps means stageItems recalculates whenever any of those job fields change, even if the derived stage dates haven't changed. This is overly broad.

Fix: Use useMemo for the stage-transition lookups inside getStageTransitionDate, or inline the logic into stageItems and depend only on job.status and job.statusHistory.

Legacy Component Usage
31. TrackerOnboarding.tsx uses legacy useState + setTimeout for tour step management
File: TrackerOnboarding.tsx:946-1006 A fully custom tour implementation with manual slide indexing, no accessibility attributes, no keyboard navigation, and no skip-to-end. This duplicates functionality available in libraries like react-joyride or @reactour/tour.

Fix: Migrate to a maintained tour library, or at minimum add role="dialog", aria-label, and arrow-key handling.

32. JobSidebar.tsx stores notes as a custom --- DATE ---\nCONTENT string in a single DB field
File: JobSidebar.tsx:237-267, 1127-1263 Notes are stored as a concatenated string with regex parsing. This is a legacy pattern that makes it impossible to query individual notes server-side, edit a single note without rewriting the whole string, or paginate notes.

Fix: Migrate to a proper job_notes table with id, job_id, content, created_at. The current format should be treated as a migration target, not a long-term schema.

33. EditJobSidebar.tsx uses uuidv4 for client-side ID generation
File: EditJobSidebar.tsx:32

import { v4 as uuidv4 } from 'uuid';
The uuid package is a legacy dependency. Modern alternatives (crypto.randomUUID(), nanoid) are smaller and don't require a polyfill in browsers.

Fix: Replace with crypto.randomUUID() (available in all modern browsers) or nanoid.

34. JobsListView.tsx uses <table> with manual pagination skeleton instead of a reusable DataTable component
File: JobsListView.tsx:90-284 The list view renders a raw <table> with hardcoded 8 columns. The kanban view uses a completely different card-based layout. There is no shared JobRow or JobCard primitive, meaning any layout or field change must be applied in two places.

Fix: Extract JobRow and JobCard from their respective views into a shared src/components/dashboard/jobs/primitives/ directory.

35. JobSidebar.tsx uses motion.div from framer-motion for panel animations but AnimatePresence is unused
File: JobSidebar.tsx:4

import { motion, AnimatePresence } from 'framer-motion';
AnimatePresence is imported but not used in this file. It's likely used in the parent. The motion.div usage for the sidebar panel is fine, but the unused import indicates copy-paste from another component.

Fix: Remove unused AnimatePresence import.

36. JobSidebar.tsx handleTabChange resets showEmailTemplate but doesn't clear replyText
File: JobSidebar.tsx:218-223

const handleTabChange = (tab: typeof activeTab) => {
  setActiveTab(tab);
  if (tab !== 'communication') {
    setShowEmailTemplate(false);
  }
};
When leaving the communication tab, replyText, isSending, and tonePreference are not reset. If the user returns to the tab later, they see their old draft and sending state.

Fix: Reset communication-specific state on tab change:

if (tab !== 'communication') {
  setShowEmailTemplate(false);
  setReplyText('');
  setIsSending(false);
}
Summary Matrix
#	Severity	File	Issue
1	🔴 Critical	10+ files	JobApplication interface duplicated
2	🔴 Critical	TrackerOnboarding, JobsKanbanView	localStorage without SSR guard
3	🔴 Critical	JobSidebar, JobsKanbanView	isFollowUpNeeded always true for days >= 3
4	🔴 Critical	JobSidebar.tsx:168	useEffect dependency on job object causes re-render loop
5	🔴 Critical	JobSidebar.tsx:1463	handleCreateJourney race condition
6	🔴 Critical	EditJobSidebar, JobsListView	@ts-nocheck suppresses types
7	🟠 High	4 locations	Credit error handling duplicated
8	🟠 High	JobsTracker + JobSidebar	loadTrackerGenerationPreview duplicated
9	🟠 High	JobSidebar.tsx	3682-line god component
10	🟠 High	EditJobSidebar.tsx	Hardcoded 15-day deadline default
11	🟠 High	JobsKanbanView.tsx	Duplicate JobApplication interface
12	🟠 High	JobKanbanCard.tsx	Duplicate JobApplication interface
13	🟠 High	6 stage files	Each defines own JobApplication
14	🟠 High	JobsKanbanView.tsx	Expired accordion action buttons are no-ops
15	🟠 High	JobSidebar.tsx	handleCreateJourney + executeMoveToCreated duplicate API call
16	🟠 High	JobSidebar.tsx	loadJourneysForJob redundant with parent
17	🟠 High	JobsTracker.tsx:784	handleJobSaved uses stale editingJob
18	🟠 High	JobsTracker.tsx:827	Keyboard shortcuts may use stale viewMode
19	🟡 Medium	TrackerOnboarding.tsx	localStorage without typeof window guard
20	🟡 Medium	JobSidebar.tsx	getEmailTemplate unsanitized interpolation
21	🟡 Medium	JobsKanbanView.tsx	onMouseEnter/onMouseLeave mutates DOM className directly
22	🟡 Medium	JobSidebar.tsx	followUpTimeline useMemo depends on unstable job ref
23	🟡 Medium	JobSidebar.tsx	parseNotes regex brittle, no length guard
24	🟡 Medium	JobsKanbanView.tsx	localStorage errors silently ignored
25	🟡 Medium	JobSidebar.tsx	handleSaveDetails doesn't await onRefresh
26	🟢 Low	TrackerOnboarding.tsx.bak	Backup file in source tree
27	🟢 Low	JobsTracker.tsx	limitInfo null-check repeated 4 times
28	🟢 Low	JobsKanbanView.tsx	isFollowUpNeeded duplicated with bug
29	🟢 Low	JobsKanbanView.tsx	getEmailSubject duplicated
30	🟢 Low	JobSidebar.tsx	stageItems deps overly broad
31	🟢 Low	TrackerOnboarding.tsx	Legacy custom tour implementation
32	🟢 Low	JobSidebar.tsx	Notes stored as concatenated string
33	🟢 Low	EditJobSidebar.tsx	Legacy uuid package
34	🟢 Low	JobsListView + JobsKanbanView	No shared job row/card primitive
35	🟢 Low	JobSidebar.tsx	Unused AnimatePresence import
36	🟢 Low	JobSidebar.tsx	Tab change doesn't clear comms state
Recommended immediate fix order: #1 (type safety), #3 (logic bug), #4 (render loop), #5 (race condition), #6 (types suppressed), #2 (SSR crash), #14 (dead buttons), #7 (inconsistent paywall).

