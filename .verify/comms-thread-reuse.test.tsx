/**
 * Verification for the "comms tab in the journey sidebar is the same reading pane" change,
 * plus the "stop refetching on every tab visit" change.
 *
 * Three things are worth proving here and none of them are visible to `tsc`:
 *
 *  1. `EmailDetail` is genuinely self-contained. It is now rendered from two different
 *     parents, and its props are the only coupling. Rendering it standalone with realistic
 *     data is the cheapest proof that it does not reach into `CommsPanel`'s component scope.
 *  2. The comms cache-key format lives in exactly one place. Two surfaces share those entries,
 *     so a hand-built key on either side would silently stop matching — a bug that looks like
 *     "the cache is broken" rather than "the keys disagree".
 *  3. The sidebar's Comms tab really renders the shared pane, and the old synthesised thread
 *     (which told every applied job "your application has been received") is gone.
 *
 * Run: node .verify/run-test.mjs .verify/comms-thread-reuse.test.tsx
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToString } from 'react-dom/server';

import {
  commsCacheUserId,
  commsListCacheKey,
  commsJobsCacheKey,
  commsUnreadCacheKey,
  commsAccountCacheKey,
} from '@/lib/utils/comms-cache-keys';
import { EmailDetail } from '@/components/dashboard/jobs/CommsPanel';

const ROOT = process.cwd();
const read = (p: string) => readFileSync(path.join(ROOT, p), 'utf8');

const commsPanelSrc = read('src/components/dashboard/jobs/CommsPanel.tsx');
const jobSidebarSrc = read('src/components/dashboard/jobs/JobSidebar.tsx');
const applicationsPanelSrc = read('src/components/jobs/ApplicationsPanel.tsx');
const autoApplyPanelSrc = read('src/components/jobs/AutoApplyPanel.tsx');

// ── Fixtures ────────────────────────────────────────────────────────────────
// `jobId` on a communication is the `JobApplication._id` across this codebase, so the job
// object the sidebar holds (`job._id`) is what a message links back to.
const JOB = {
  _id: 'app-1',
  jobTitle: 'Senior Backend Engineer',
  title: 'Senior Backend Engineer',
  company: 'Stripe',
  companyLogo: 'https://cdn.example.com/stripe.png',
} as any;

const makeComm = (over: Record<string, unknown> = {}) => ({
  _id: 'c1',
  userId: 'u1',
  messageId: '<m1@stripe.com>',
  direction: 'inbound',
  type: 'email',
  status: 'received',
  subject: 'Interview invitation: Senior Backend Engineer',
  bodySnippet: 'We would like to schedule a call.',
  textBody:
    'Hi Amloh,\n\nWe loved your profile and would like to schedule a call.\n\nBest,\nJane',
  senderName: 'Jane Holmes',
  senderEmail: 'jane.holmes@stripe.com',
  recipients: [{ email: 'me@app.buildairesume.com', type: 'to' }],
  classification: 'INTERVIEW_INVITATION',
  isRead: false,
  isStarred: false,
  receivedAt: '2026-09-20T10:00:00.000Z',
  jobId: 'app-1',
  hasAttachments: false,
  ...over,
});

const INBOUND = makeComm();
const OUTBOUND = makeComm({
  _id: 'c2',
  direction: 'outbound',
  messageId: '<m2@me>',
  subject: 'Re: Interview invitation: Senior Backend Engineer',
  textBody: 'Thanks Jane — happy to talk this week.',
  senderName: 'Amloh',
  senderEmail: 'me@app.buildairesume.com',
  classification: 'FOLLOW_UP',
  receivedAt: '2026-09-21T09:00:00.000Z',
}) as any;

const noop = () => {};

/**
 * React emits adjacent text nodes as `{a}<!-- -->{b}`, so matching raw SSR output against
 * visible copy fails on things like `2<!-- --> messages`. Strip comments and tags first —
 * the rendered *text* is what these assertions are about.
 */
const asText = (html: string) =>
  html
    .replace(/<!--.*?-->/g, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const render = (extra: Record<string, unknown> = {}) =>
  renderToString(
    React.createElement(EmailDetail as any, {
      communication: INBOUND,
      allCommunications: [INBOUND, OUTBOUND],
      jobs: [JOB],
      assignedEmail: 'me@app.buildairesume.com',
      candidateName: 'Amloh',
      onToggleStar: noop,
      onSetReadState: noop,
      ...extra,
    })
  );

// ── 1. The reading pane renders standalone ──────────────────────────────────
describe('EmailDetail renders standalone with realistic data', () => {
  const html = render();
  const text = asText(html);

  it('renders without throwing', () => {
    expect(typeof html).toBe('string');
    expect(html.length).toBeGreaterThan(500);
  });

  it('renders the whole thread, not just the selected message', () => {
    expect(text).toContain('We loved your profile');
    expect(text).toContain('happy to talk this week');
  });

  it('labels the thread size from allCommunications', () => {
    expect(text).toContain('2 messages');
  });

  it('resolves the linked job from the jobs prop', () => {
    // `linkedJob` drives the header, the avatar and the composer copy, so its absence would
    // show up as "Company" and a generic draft rather than Stripe.
    expect(text).toContain('Stripe');
    expect(text).toContain('Senior Backend Engineer');
  });

  it('prefills a recipient, because the selected message is inbound', () => {
    expect(html).toContain('jane.holmes@stripe.com');
  });

  it('prefills the draft from the linked job, not from generic placeholders', () => {
    expect(text).toContain('Dear Jane Holmes');
    expect(text).not.toContain('the position');
    expect(text).not.toContain('your company');
  });
});

// ── 2. onClose is optional ──────────────────────────────────────────────────
describe('EmailDetail tolerates a missing onClose', () => {
  it('hides both close controls when onClose is omitted', () => {
    const html = render();
    expect(html).not.toContain('Back to list');
    expect(html).not.toContain('Close reading pane');
  });

  it('renders both close controls when onClose is provided', () => {
    const html = render({ onClose: noop });
    expect(html).toContain('Back to list');
    expect(html).toContain('Close reading pane');
  });
});

// ── 3. Cache keys live in one place ─────────────────────────────────────────
describe('comms cache keys', () => {
  it('falls back to a stable user segment', () => {
    expect(commsCacheUserId('abc')).toBe('abc');
    expect(commsCacheUserId(undefined)).toBe('anon');
    expect(commsCacheUserId(null)).toBe('anon');
    expect(commsCacheUserId('')).toBe('anon');
  });

  it('builds a filter-dependent list key in a stable order', () => {
    expect(commsListCacheKey('u1', { jobId: 'app-1' })).toBe('comms:u1:jobId=app-1');
    expect(commsListCacheKey('u1', {})).toBe('comms:u1:');
    expect(
      commsListCacheKey('u1', { jobId: 'app-1', direction: 'inbound' })
    ).toBe('comms:u1:jobId=app-1&direction=inbound');
  });

  it('keeps the auxiliary keys namespaced per user', () => {
    expect(commsJobsCacheKey('u1')).toBe('comms-jobs:u1');
    expect(commsUnreadCacheKey('u1')).toBe('comms-unread:u1');
    expect(commsAccountCacheKey('u1')).toBe('comms-account:u1');
  });

  it('is not hand-built by either consumer', () => {
    // The whole point of the shared module: no call site may re-derive the format.
    expect(commsPanelSrc).not.toMatch(/`comms-jobs:\$\{/);
    expect(jobSidebarSrc).not.toMatch(/`comms-jobs:\$\{/);
    expect(commsPanelSrc).not.toMatch(/`comms:\$\{/);
    expect(jobSidebarSrc).not.toMatch(/`comms:\$\{/);
  });

  it('is built through the shared helper by both consumers', () => {
    expect(commsPanelSrc).toContain('commsListCacheKey(userId, f)');
    expect(jobSidebarSrc).toContain('commsListCacheKey(commsUserId, { jobId: job._id })');
  });
});

// ── 4. The sidebar's Comms tab uses the shared pane ─────────────────────────
describe('journey sidebar Comms tab', () => {
  it('renders the shared reading pane for this job', () => {
    expect(jobSidebarSrc).toContain('<EmailDetail');
    expect(jobSidebarSrc).toContain('allCommunications={commsThread}');
    expect(jobSidebarSrc).toContain('jobs={commsJobs}');
  });

  it('no longer synthesises a thread from job.status', () => {
    expect(jobSidebarSrc).not.toContain('Thank you for your application');
    expect(jobSidebarSrc).not.toContain('Always show drafted email');
    expect(jobSidebarSrc).not.toContain('Waiting for response');
  });

  it('fetches the job thread, and only when the tab is open', () => {
    expect(jobSidebarSrc).toContain("/api/communications?jobId=");
    expect(jobSidebarSrc).toContain("if (activeTab !== 'communication') return;");
  });

  it('reuses the page-load cache instead of refetching on every visit', () => {
    expect(jobSidebarSrc).toContain('readSessionCache<{ list: Communication[]; unread: number }>(commsThreadCacheKey)');
    expect(jobSidebarSrc).toContain('writeSessionCache(commsThreadCacheKey');
  });

  it('mirrors local read/star changes back into the shared entry', () => {
    expect(jobSidebarSrc).toContain('commsMutationRevision');
    expect(jobSidebarSrc).toContain('writeSessionCache(commsThreadCacheKey, { ...cached, list: commsThread })');
  });

  it('resolves the user the same way the Comms tab does', () => {
    expect(jobSidebarSrc).toContain('commsCacheUserId(getUserIdForAPI(user))');
    expect(commsPanelSrc).toContain('commsCacheUserId((session?.user as any)?.id)');
  });
});

// ── 5. Every named tab hydrates from the session cache ──────────────────────
describe('tab data is cached for the page load, not refetched per visit', () => {
  it('application tracker hydrates and mirrors', () => {
    expect(applicationsPanelSrc).toContain('trackerCacheKey');
    expect(applicationsPanelSrc).toContain('readSessionCache');
    expect(applicationsPanelSrc).toContain('writeSessionCache');
  });

  it('comms panel hydrates every one of its four fetches', () => {
    expect(commsPanelSrc).toContain('readSessionCache<any>(commsAccountCacheKey)');
    expect(commsPanelSrc).toContain('readSessionCache<any>(commsListKey(filter))');
    expect(commsPanelSrc).toContain('readSessionCache<any>(commsJobsCacheKey)');
    expect(commsPanelSrc).toContain('readSessionCache<any>(commsUnreadCacheKey)');
  });

  it('settings hydrates and mirrors, gated so defaults are never cached', () => {
    expect(autoApplyPanelSrc).toContain('prefsCacheKey');
    expect(autoApplyPanelSrc).toContain('entitlementsCacheKey');
    expect(autoApplyPanelSrc).toContain('if (!dataLoaded) return;');
  });

  it('nothing is cached before the first load has real data', () => {
    // Caching the built-in defaults would make a remount skip the fetch and present them as
    // the user's saved settings — the one way this optimisation can corrupt what is shown.
    expect(autoApplyPanelSrc).toContain('const [dataLoaded, setDataLoaded] = useState(false);');
    expect(autoApplyPanelSrc).toContain('if (!dataLoaded) return;');
  });
});
