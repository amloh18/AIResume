import { BASE_TEMPLATE } from '@/lib/campaign-templates';
import type { AutomationCategory, AutomationTriggerType } from '@/models/EmailAutomation';

/**
 * Code-side catalogue of every automated lifecycle email.
 *
 * The admin UI edits the DB override (`EmailAutomation`); the runtime in the
 * product app resolves `DB override ?? this default`. Adding a new automation
 * means adding one entry here — no admin migration required.
 */
export interface AutomationDefinition {
  key: string;
  name: string;
  description: string;
  category: AutomationCategory;
  enabled: boolean;
  triggerType: AutomationTriggerType;
  event?: string;
  delayHours?: number;
  anchor?: 'createdAt' | 'lastLogin' | 'updatedAt';
  schedule?: string;
  subject: string;
  previewText?: string;
  htmlContent: string;
  fromName?: string;
  fromEmail?: string;
  audience?: {
    plans?: string[];
    requireCv?: boolean;
    excludeWithCv?: boolean;
    onboardingIncomplete?: boolean;
  };
  digest?: {
    includeDeadlines: boolean;
    includeFollowUps: boolean;
    includeActionRequired: boolean;
  };
  /** Variables the template understands — shown in the admin editor. */
  variables: string[];
}

const APP_URL = '{{appUrl}}';

function hero(tag: string, title: string, desc: string): string {
  return `
  <div class="hero-content">
    <span class="hero-tag">${tag}</span>
    <h1 class="hero-title">${title}</h1>
    <p class="hero-desc">${desc}</p>
  </div>`;
}

function block(html: string): string {
  return `<div class="content-block"><p class="body-text">${html}</p></div>`;
}

function cta(href: string, label: string): string {
  return `<div class="btn-container"><a href="${href}" class="btn">${label}</a></div>`;
}

function page(title: string, content: string): string {
  return BASE_TEMPLATE(content, title);
}

const DASHBOARD = `${APP_URL}/dashboard`;

export const AUTOMATION_CATALOG: AutomationDefinition[] = [
  {
    key: 'welcome',
    name: 'Welcome email',
    description: 'Sent immediately after a new account is created or verified.',
    category: 'lifecycle',
    enabled: true,
    triggerType: 'event',
    event: 'user.signup',
    subject: 'Welcome to AIResume, {{firstName}} 👋',
    previewText: 'Your AI-powered job search starts here.',
    htmlContent: page(
      'Welcome to AIResume',
      hero(
        'Welcome aboard',
        'Hi {{firstName}}, your job search just got an upgrade.',
        'AIResume builds a master profile, tailors your CV to every job, and tracks every application in one place.'
      ) +
        block(
          'Here is the quickest path to your first tailored application:<br/><br/>' +
            '1. Add your current CV or build one from scratch.<br/>' +
            '2. We score it and show exactly what to improve.<br/>' +
            '3. Tailor it to a job in one click.'
        ) +
        cta(`${APP_URL}/dashboard/jobs`, 'Build my first resume')
    ),
    variables: ['firstName', 'lastName', 'email', 'appUrl'],
  },
  {
    key: 'onboarding_complete',
    name: 'Onboarding complete',
    description: 'Sent when the user finishes onboarding and their resume score is ready.',
    category: 'onboarding',
    enabled: true,
    triggerType: 'event',
    event: 'onboarding.completed',
    subject: 'Your resume is ready — here is your score',
    previewText: 'See your score and the next step to land more interviews.',
    htmlContent: page(
      'Your resume is ready',
      hero(
        'Onboarding complete',
        'Nice work, {{firstName}} — your resume is ready.',
        'Your master profile has been scored and is ready to be tailored to real jobs.'
      ) +
        block(
          'Your current resume score is <strong>{{score}}</strong>. The biggest wins usually come from quantifying achievements and matching keywords from the job description.<br/><br/>' +
            'Next step: pick a job and tailor your resume in one click — the AI rewrites the parts that matter for that role.'
        ) +
        cta(`${DASHBOARD}/jobs`, 'Tailor my resume to a job')
    ),
    variables: ['firstName', 'lastName', 'email', 'score', 'appUrl'],
  },
  {
    key: 'abandoned_onboarding_1',
    name: 'Abandoned onboarding — 24h',
    description: 'First nudge 24 hours after signup when onboarding was not completed.',
    category: 'onboarding',
    enabled: true,
    triggerType: 'relative',
    anchor: 'createdAt',
    delayHours: 24,
    subject: 'You are 2 minutes away from your first tailored CV',
    previewText: 'Finish your profile and let AI do the heavy lifting.',
    htmlContent: page(
      'Finish your profile',
      hero(
        'Still with us?',
        '{{firstName}}, you are 2 minutes away from your first tailored CV.',
        'You started building your profile but did not quite finish. Pick up exactly where you left off.'
      ) +
        block(
          'A complete master profile unlocks one-click tailoring, ATS scoring and job tracking — the three things that move the needle fastest.'
        ) +
        cta(`${DASHBOARD}/onboarding`, 'Finish my profile')
    ),
    audience: { onboardingIncomplete: true, plans: ['free', 'starter_monthly'] },
    variables: ['firstName', 'lastName', 'email', 'appUrl'],
  },
  {
    key: 'abandoned_onboarding_2',
    name: 'Abandoned onboarding — 72h',
    description: 'Second nudge 72 hours after signup when onboarding was not completed.',
    category: 'onboarding',
    enabled: true,
    triggerType: 'relative',
    anchor: 'createdAt',
    delayHours: 72,
    subject: 'Still thinking? Let us finish your resume together',
    previewText: 'Your progress is saved — one short step to go.',
    htmlContent: page(
      'Your progress is saved',
      hero(
        'One step left',
        '{{firstName}}, your progress is saved — let us finish this.',
        'Completing your profile takes a couple of minutes and unlocks everything AIResume can do for you.'
      ) +
        block(
          'Once your master profile is ready you can tailor a resume to any job in one click, check your ATS score, and track every application automatically.'
        ) +
        cta(`${DASHBOARD}/onboarding`, 'Continue onboarding')
    ),
    audience: { onboardingIncomplete: true, plans: ['free', 'starter_monthly'] },
    variables: ['firstName', 'lastName', 'email', 'appUrl'],
  },
  {
    key: 'empty_account',
    name: 'Empty account reminder',
    description: 'Sent about a day after signup when the account still has no CV.',
    category: 'onboarding',
    enabled: true,
    triggerType: 'relative',
    anchor: 'createdAt',
    delayHours: 26,
    subject: 'Your AI resume is waiting to be built',
    previewText: 'Start from your existing CV or build one from scratch.',
    htmlContent: page(
      'Build your first resume',
      hero(
        'Let us get started',
        '{{firstName}}, your AI resume is waiting to be built.',
        'Upload an existing CV or answer a few questions and we will build a recruiter-ready resume for you.'
      ) +
        block(
          'It takes about three minutes, and you can edit everything afterwards. Your first resume score is included.'
        ) +
        cta(`${DASHBOARD}/cvs`, 'Build my resume')
    ),
    audience: { excludeWithCv: true },
    variables: ['firstName', 'lastName', 'email', 'appUrl'],
  },
  {
    key: 'draft_saved',
    name: 'Draft saved',
    description: 'Sent after a user saves a CV draft for the first time.',
    category: 'transactional',
    enabled: true,
    triggerType: 'event',
    event: 'cv.draft_saved',
    subject: 'Your draft is saved — want it recruiter-ready?',
    previewText: 'Turn your draft into a scored, tailored resume.',
    htmlContent: page(
      'Draft saved',
      hero(
        'Draft saved',
        'Your draft is safe, {{firstName}}.',
        'You can come back any time. When you are ready, we can turn it into a scored, recruiter-ready resume.'
      ) +
        block(
          'Finishing your profile unlocks ATS scoring, keyword matching and one-click tailoring for every job you apply to.'
        ) +
        cta(`${DASHBOARD}/cvs`, 'Finish my resume')
    ),
    variables: ['firstName', 'lastName', 'email', 'appUrl'],
  },
  {
    key: 'master_cv_guide',
    name: 'Master CV guide',
    description: 'Sent after the first CV is created to explain master profiles.',
    category: 'transactional',
    enabled: true,
    triggerType: 'event',
    event: 'cv.first_created',
    subject: 'Turn your CV into a master profile',
    previewText: 'Build once, tailor for every job.',
    htmlContent: page(
      'Master profile guide',
      hero(
        'Pro tip',
        'Build once. Tailor for every job.',
        'Your master profile is the single source of truth AIResume tailors from, so you never start from a blank page again.'
      ) +
        block(
          'Keep it complete and up to date — every new achievement you add makes every future tailored resume stronger.'
        ) +
        cta(`${DASHBOARD}/cvs`, 'Open my master profile')
    ),
    variables: ['firstName', 'lastName', 'email', 'appUrl'],
  },
  {
    key: 'free_to_pro_1',
    name: 'Free to Pro — day 7',
    description: 'First upgrade nudge for free users one week after signup.',
    category: 'conversion',
    enabled: true,
    triggerType: 'relative',
    anchor: 'createdAt',
    delayHours: 168,
    subject: '{{firstName}}, unlock unlimited AI tailoring',
    previewText: 'See what Pro adds to your job search.',
    htmlContent: page(
      'Upgrade to Pro',
      hero(
        'Go further with Pro',
        '{{firstName}}, get unlimited AI tailoring.',
        'You have seen what AIResume can do. Pro removes every limit so you can tailor as many applications as you like.'
      ) +
        block(
          'Pro includes unlimited AI tailoring, advanced ATS analysis, priority support and every future feature we ship.'
        ) +
        cta(`${APP_URL}/#pricing`, 'See Pro plans')
    ),
    audience: { plans: ['free', 'starter_monthly'], requireCv: true },
    variables: ['firstName', 'lastName', 'email', 'appUrl'],
  },
  {
    key: 'free_to_pro_2',
    name: 'Free to Pro — day 14',
    description: 'Second upgrade nudge for free users two weeks after signup.',
    category: 'conversion',
    enabled: true,
    triggerType: 'relative',
    anchor: 'createdAt',
    delayHours: 336,
    subject: 'The fastest way to more interviews',
    previewText: 'Tailored applications get more replies. Here is how Pro helps.',
    htmlContent: page(
      'More interviews with Pro',
      hero(
        'Apply smarter',
        'Tailored applications get more replies.',
        '{{firstName}}, the difference between a generic CV and a tailored one is often the difference between silence and an interview.'
      ) +
        block(
          'Pro gives you unlimited tailored resumes, cover letters and ATS checks — so every application you send is the strongest version of you.'
        ) +
        cta(`${APP_URL}/#pricing`, 'Upgrade to Pro')
    ),
    audience: { plans: ['free', 'starter_monthly'], requireCv: true },
    variables: ['firstName', 'lastName', 'email', 'appUrl'],
  },
  {
    key: 'free_to_pro_3',
    name: 'Free to Pro — day 30',
    description: 'Final upgrade nudge with a discount for free users at 30 days.',
    category: 'conversion',
    enabled: true,
    triggerType: 'relative',
    anchor: 'createdAt',
    delayHours: 720,
    subject: 'Your exclusive upgrade offer',
    previewText: 'A limited-time discount on AIResume Pro.',
    htmlContent: page(
      'Your exclusive offer',
      hero(
        'Limited offer',
        'An exclusive upgrade offer, just for you.',
        '{{firstName}}, here is a limited-time discount on AIResume Pro — unlimited tailoring, ATS scoring and priority support.'
      ) +
        block(
          'Use code <strong>{{couponCode}}</strong> at checkout. This offer expires in {{expiresIn}}.'
        ) +
        cta(`${APP_URL}/#pricing`, 'Claim my discount')
    ),
    audience: { plans: ['free', 'starter_monthly'], requireCv: true },
    variables: ['firstName', 'lastName', 'email', 'couponCode', 'expiresIn', 'appUrl'],
  },
  {
    key: 'limit_reached',
    name: 'Free limit reached',
    description: 'Sent when a free user exhausts their AI action allowance.',
    category: 'conversion',
    enabled: true,
    triggerType: 'event',
    event: 'usage.limit_reached',
    subject: 'You have hit your free limit — keep going with Pro',
    previewText: 'Unlock unlimited AI actions and keep your momentum.',
    htmlContent: page(
      'Keep your momentum',
      hero(
        'Limit reached',
        '{{firstName}}, you have used all your free AI actions.',
        'You are clearly putting in the work. Pro removes the limit so you can keep applying without slowing down.'
      ) +
        block(
          'Upgrade once and get unlimited tailoring, cover letters, ATS checks and priority support for the rest of your search.'
        ) +
        cta(`${APP_URL}/#pricing`, 'Upgrade and keep going')
    ),
    variables: ['firstName', 'lastName', 'email', 'planName', 'appUrl'],
  },
  {
    key: 'inactivity_7',
    name: 'Inactive — 7 days',
    description: 'Re-engagement email for users who have not logged in for a week.',
    category: 'lifecycle',
    enabled: true,
    triggerType: 'relative',
    anchor: 'lastLogin',
    delayHours: 168,
    subject: 'New jobs matched to your profile this week',
    previewText: 'Fresh matches are waiting for you.',
    htmlContent: page(
      'New matches for you',
      hero(
        'Welcome back',
        '{{firstName}}, new jobs are waiting for you.',
        'It has been a week since your last visit. Fresh roles matched to your profile have landed since then.'
      ) +
        block('Pick up where you left off and tailor an application in one click.') +
        cta(`${DASHBOARD}/jobs`, 'See my matches')
    ),
    variables: ['firstName', 'lastName', 'email', 'jobCount', 'appUrl'],
  },
  {
    key: 'inactivity_30',
    name: 'Inactive — 30 days',
    description: 'Win-back email for users inactive for a month.',
    category: 'lifecycle',
    enabled: true,
    triggerType: 'relative',
    anchor: 'lastLogin',
    delayHours: 720,
    subject: 'We saved your progress — pick up where you left off',
    previewText: 'Your profile and applications are exactly where you left them.',
    htmlContent: page(
      'Pick up where you left off',
      hero(
        'Still here for you',
        'Your progress is exactly where you left it.',
        '{{firstName}}, it has been a while. Your profile, resumes and application tracker are all saved.'
      ) +
        block(
          'Whether you paused your search or got busy, restarting takes one click — and we will show you what changed in the market while you were away.'
        ) +
        cta(`${DASHBOARD}/jobs`, 'Restart my job search')
    ),
    variables: ['firstName', 'lastName', 'email', 'appUrl'],
  },
  {
    key: 'daily_digest',
    name: 'Daily job application digest',
    description:
      'One consolidated daily email replacing the job report and every per-job action-required email.',
    category: 'reports',
    enabled: true,
    triggerType: 'schedule',
    schedule: 'daily 08:00',
    subject: 'Your daily job search brief',
    previewText: 'Applications, deadlines and follow-ups that need you today.',
    htmlContent: page(
      'Your daily job search brief',
      hero(
        'Daily brief',
        'Good morning, {{firstName}}.',
        'Here is everything that moved in your job search since yesterday — and anything that needs you today.'
      ) +
        block('{{digestSummary}}') +
        `<div class="content-block">{{digestItems}}</div>` +
        cta(`${DASHBOARD}/jobs?tab=applications`, 'Open my applications')
    ),
    digest: {
      includeDeadlines: true,
      includeFollowUps: true,
      includeActionRequired: true,
    },
    variables: ['firstName', 'lastName', 'email', 'digestSummary', 'digestItems', 'appUrl'],
  },
];

export type AutomationKey =
  | 'welcome'
  | 'onboarding_complete'
  | 'abandoned_onboarding_1'
  | 'abandoned_onboarding_2'
  | 'empty_account'
  | 'draft_saved'
  | 'master_cv_guide'
  | 'free_to_pro_1'
  | 'free_to_pro_2'
  | 'free_to_pro_3'
  | 'limit_reached'
  | 'inactivity_7'
  | 'inactivity_30'
  | 'daily_digest';

const CATALOG_BY_KEY = new Map(AUTOMATION_CATALOG.map((a) => [a.key, a]));

export function getDefaultAutomation(key: string): AutomationDefinition | undefined {
  return CATALOG_BY_KEY.get(key);
}

export const AUTOMATION_CATEGORIES: Array<{ id: AutomationCategory; label: string }> = [
  { id: 'lifecycle', label: 'Lifecycle' },
  { id: 'onboarding', label: 'Onboarding' },
  { id: 'conversion', label: 'Free → Pro' },
  { id: 'reports', label: 'Reports' },
  { id: 'transactional', label: 'Transactional' },
];

export interface AutomationRenderData {
  firstName?: string;
  lastName?: string;
  email?: string;
  appUrl?: string;
  score?: string | number;
  planName?: string;
  couponCode?: string;
  expiresIn?: string;
  jobCount?: string | number;
  digestSummary?: string;
  digestItems?: string;
  unsubscribeUrl?: string;
  [key: string]: string | number | undefined;
}

const TOKEN_RE = /{{\s*([a-zA-Z0-9_]+)\s*}}/g;

export function renderAutomationTemplate(
  template: string,
  data: AutomationRenderData
): string {
  const appUrl = data.appUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://buildairesume.com';
  const fallback: Record<string, string> = {
    firstName: 'there',
    lastName: '',
    email: '',
    appUrl,
    score: '—',
    planName: 'Free',
    couponCode: '',
    expiresIn: '7 days',
    jobCount: '0',
    digestSummary: '',
    digestItems: '',
    unsubscribeUrl: `${appUrl}/unsubscribe`,
  };

  return template.replace(TOKEN_RE, (_match, token: string) => {
    const value = data[token];
    if (value === undefined || value === null || value === '') {
      return fallback[token] ?? '';
    }
    return String(value);
  });
}

export interface DigestItem {
  kind: 'deadline' | 'follow_up' | 'action_required' | 'application';
  title: string;
  message: string;
  url: string;
  priority?: 'urgent' | 'high' | 'medium' | 'low';
}

const PRIORITY_COLOR: Record<string, string> = {
  urgent: '#ff5c5c',
  high: '#ffb020',
  medium: '#7dd3fc',
  low: 'rgba(255,255,255,0.55)',
};

function esc(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Renders digest rows in the same visual language as the base template. */
export function renderDigestItems(items: DigestItem[], appUrl?: string): string {
  const base = appUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://buildairesume.com';
  if (!items.length) {
    return `<p class="body-text" style="margin:0;">Nothing needs your attention right now. Keep the momentum going.</p>`;
  }

  return items
    .map((item) => {
      const href = /^https?:\/\//.test(item.url) ? item.url : `${base}${item.url}`;
      const color = PRIORITY_COLOR[item.priority || 'medium'] || PRIORITY_COLOR.medium;
      return `
      <div style="background-color:#20291d;border:1px solid rgba(1,63,46,0.18);border-radius:18px;padding:18px 20px;margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
          <span style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:${color};">${esc(item.kind.replace(/_/g, ' '))}</span>
        </div>
        <p style="margin:8px 0 6px;font-size:16px;font-weight:700;color:#ffffff;">${esc(item.title)}</p>
        <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:rgba(255,255,255,0.65);">${esc(item.message)}</p>
        <a href="${esc(href)}" style="display:inline-block;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;color:#013f2e;text-decoration:none;">Open &rarr;</a>
      </div>`;
    })
    .join('');
}
