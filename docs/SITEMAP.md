# BuildAIResume — Application Sitemap & Route Directory

This document provides a comprehensive map of all user-facing pages, interactive tools, and API endpoints within the Next.js App Router (`apps/airesume_app/src/app`).

---

## 1. Public & Marketing Pages

| Route | File Path | Description | Access Level |
| :--- | :--- | :--- | :--- |
| `/` | `src/app/page.tsx` | Main marketing landing page, product value proposition, CTA. | Public |
| `/features` | `src/app/features/page.tsx` | Feature deep-dives (Builder, Matcher, Auto-Apply, Tracker). | Public |
| `/templates` | `src/app/templates/page.tsx` | Resume template gallery and interactive previewer. | Public |
| `/explore` | `src/app/explore/page.tsx` | Job board exploration and discovery preview. | Public |
| `/ats-resume-checker` | `src/app/ats-resume-checker/page.tsx` | Free standalone ATS scanner and score evaluator. | Public |
| `/resume-score` | `src/app/resume-score/page.tsx` | Instant resume analysis and keyword breakdown. | Public |
| `/linkedin-enhancer` | `src/app/linkedin-enhancer/page.tsx` | LinkedIn profile audit tool based on candidate experience. | Public |
| `/compare/*` | `src/app/compare/*/page.tsx` | Product comparisons (e.g. AIResume vs CakeResume). | Public |
| `/blog` | `src/app/blog/page.tsx` | Career blog hub, ATS writing guides, and industry tips. | Public |
| `/blog/[slug]` | `src/app/blog/[slug]/page.tsx` | Individual career advice and technical resume articles. | Public |
| `/legal/privacy` | `src/app/legal/privacy/page.tsx` | Privacy Policy and data handling compliance. | Public |
| `/legal/terms` | `src/app/legal/terms/page.tsx` | Terms of Service and user agreement. | Public |
| `/legal/cookies` | `src/app/legal/cookies/page.tsx` | Cookie policy and analytics disclosure. | Public |
| `/legal/support` | `src/app/legal/support/page.tsx` | Help center, support desk, and contact channels. | Public |

---

## 2. Authentication & Onboarding

| Route | File Path | Description | Access Level |
| :--- | :--- | :--- | :--- |
| `/sign-in` | `src/app/sign-in/page.tsx` | Primary sign-in page (Email + Password, Google, Apple). | Public (Guest) |
| `/sign-up` | `src/app/sign-up/[[...sign-up]]/page.tsx` | Candidate registration wizard. | Public (Guest) |
| `/auth/verify-email` | `src/app/auth/verify-email/page.tsx` | Email token confirmation landing. | Public |
| `/auth/reset-password`| `src/app/auth/reset-password/page.tsx`| Password reset request and submission. | Public |
| `/auth/magic-link` | `src/app/auth/magic-link/page.tsx` | Passwordless sign-in confirmation. | Public |
| `/auth/error` | `src/app/auth/error/page.tsx` | Authentication error diagnostics and guidance. | Public |
| `/welcome` | `src/app/welcome/page.tsx` | New candidate onboarding questionnaire. | Authenticated |
| `/force-logout` | `src/app/force-logout/page.tsx` | Session invalidation and cookie clear landing. | Public |

---

## 3. Candidate Workspaces (Authenticated)

| Route | File Path | Description | Access Level |
| :--- | :--- | :--- | :--- |
| `/dashboard` | `src/app/dashboard/page.tsx` | Candidate command center: application metrics, recent activities, fresh job matches. | User / Pro |
| `/dashboard/jobs` | `src/app/dashboard/jobs/page.tsx` | Personalized job feed, saved jobs, company watchlist. | User / Pro |
| `/dashboard/documents`| `src/app/dashboard/documents/page.tsx`| Document vault: Master CV, tailored versions, cover letters. | User / Pro |
| `/dashboard/settings` | `src/app/dashboard/settings/page.tsx` | Account preferences, billing, 2FA security, UI theme. | User / Pro |
| `/editor` | `src/app/editor/page.tsx` | Full-screen interactive CV Builder (multi-step wizard, live printable canvas, ATS scoring, Mori AI dock). | User / Pro |
| `/dashboard/tracker` | `src/app/dashboard/tracker/page.tsx` | Visual Kanban board tracking application pipeline statuses. | User / Pro |
| `/interview-coach` | `src/app/interview-coach/page.tsx` | AI interview preparation coach and question practice. | User / Pro |
| `/interview-coach/[jobId]`| `src/app/interview-coach/[jobId]/page.tsx`| Job-specific interview simulation and answer evaluation. | User / Pro |
| `/profile/[username]`| `src/app/profile/[username]/page.tsx`| Candidate public web portfolio (if enabled). | Public / Shared |
| `/shared/candidate/[token]`| `src/app/shared/candidate/[token]/page.tsx`| Secure link for recruiters to view verified candidate profile. | Public (Signed) |

---

## 4. API Endpoint Directory (`/api/*`)

### 4.1 Authentication & Session
- `POST /api/auth/[...nextauth]` — NextAuth OAuth, credentials login, session resolution.
- `GET /api/auth/extension-verify` — Verifies JWT session token for the Chrome Extension.
- `POST /api/auth/reset-password` — Sends password reset emails via Stalwart.
- `GET /api/user/current` — Fetches current authenticated user profile and entitlements.
- `POST /api/user/settings/security/2fa/confirm` — Validates and activates TOTP 2-Factor Auth.

### 4.2 Master CV, Tailoring & Documents
- `GET /api/cv` / `POST /api/cv` — List and create CVs (Master or tailored).
- `GET /api/cv/[id]` / `PUT /api/cv/[id]` / `DELETE /api/cv/[id]` — Retrieve, update, or delete specific CV.
- `POST /api/cv/tailor` — Contextual AI resume tailoring against a specific job description.
- `POST /api/cv/ats-score` — Computes keyword overlap, missing skills, and layout compliance.
- `POST /api/export-pdf` — Converts printable HTML/DOM into A4 PDF stored in Cloudflare R2.
- `POST /api/upload` — Direct upload handler for candidate attachments.

### 4.3 Jobs & Ingestion Pipeline
- `GET /api/jobs` — Paginated job search with location, remote, salary, and ATS filters.
- `GET /api/jobs/recommended` — Matches jobs against candidate Master CV evidence.
- `POST /api/jobs/parse` — Parses raw job posting text or external URL into structured fields.
- `POST /api/jobs/verify-sponsorship` — Checks employer against UK Sponsor and US H-1B databases.

### 4.4 Application Automation & Queues
- `GET /api/applications` / `POST /api/applications` — List and create job application records.
- `POST /api/apply/queue` — Queues an application for Playwright worker submission.
- `GET /api/apply/status/[id]` — Polls execution status (`queued`, `running`, `needs_user_action`, `submitted`).
- `POST /api/journey-documents/create` — Generates immutable `JobJourneySnapshot` before applying.

### 4.5 Email Tracker & Recruiter Sync
- `GET /api/tracker/emails` — Fetches recruiter communication threads linked to applications.
- `POST /api/tracker/emails/sync` — Triggers JMAP sync with Stalwart mail server.
- `POST /api/tracker/emails/ai-assist` — Drafts verified recruiter reply using Candidate Evidence.

### 4.6 Notifications & Real-Time Streams
- `GET /api/notifications` — Fetches candidate notifications.
- `POST /api/notifications/read-all` — Marks all unread alerts as read.
- `GET /api/stream-notifications` — Server-Sent Events (SSE) stream for live application updates.

### 4.7 Billing, Subscriptions & Webhooks
- `GET /api/pricing-plans` — Regional pricing plans.
- `POST /api/payment/create-intent` — Generates checkout session (Polar, Stripe, Razorpay).
- `POST /api/webhooks/polar` — Polar subscription lifecycle webhook.
- `POST /api/webhooks/razorpay` — Razorpay payment confirmation webhook.
- `POST /api/webhooks/stripe` — Stripe invoice and payment webhook.

---

## 5. Middleware & Security Proxy (`src/proxy.ts`)

Next.js 16 App Router uses `src/proxy.ts` as the root request interceptor:
- **Public Routes Allowlist**: Static assets (`_next/*`, `favicon.ico`, `images/*`), marketing pages, blog posts, legal documentation, and auth callback endpoints bypass session checks.
- **Session Resolution**: Extracts `next-auth.session-token` or `__Secure-next-auth.session-token` from cookies and verifies JWT cryptographic signature using `NEXTAUTH_SECRET`.
- **Protected Routing**: Unauthenticated requests to `/dashboard/*`, `/editor/*`, `/tracker/*`, `/settings/*`, or `/interview-coach/*` are redirected to `/sign-in?callbackUrl=<requested_path>`.
- **Security Headers**: Injects `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and Content Security Policy directives on all HTML responses.
