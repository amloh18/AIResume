# BuildAIResume — Chronological App Development Logs

This document provides a consolidated, chronological narrative of the engineering history, architectural audits, phase rollouts, triage incidents, and refactoring milestones for the BuildAIResume platform.

---

## Timeline Overview

```
2025 – Early 2026: Foundation & Prototype
      │
August 2026: Editor Audits, Rendering Engines & Ingestion Pipeline
      │
September 01–15, 2026: Journey Document Integrity & API Contract Hardening
      │
September 16–23, 2026: Phase 1–8 Rollout, Staging Checkpoints & Auth Postmortem
      │
September 24–30, 2026: NotiApply Architecture, VPS Mail & Mongo Local Migration
      │
October 01–04, 2026: Server Bugs Register (SB-01–25), Dokploy Worker & Audit
      │
October 05–06, 2026: Repo Split, KPI Telemetry & Design Modernization
```

---

## 1. Foundation & Prototype (2025 – Early 2026)

- **Initial Scope**: Built as CVCircle, focused on resume templates, early ATS keyword extraction, and simple client-side document export.
- **Identified Deficiencies**:
  - Resumes were treated as detached JSON documents without an authoritative master factual record.
  - Job tracking occurred in isolated UI views without synchronization with real-world employer communications.
  - Early reliance on external third-party scraping led to frequent rate limits and stale job listings.
- **Architectural Shift**: Redefined project scope as **BuildAIResume** — an end-to-end career platform spanning the entire application lifecycle (`BUILD → MATCH → TAILOR → APPLY → TRACK → LEARN`).

---

## 2. August 2026: Editor Audits, Rendering Engines & Ingestion Pipeline

### August 15–26, 2026: CV Editor Deep Audit & Rendering Engine Review
*References: `docs/CVCircle Editor Deep Audit — Steps 1-5.md`, `docs/cv_rendering_report.md`, `docs/cv_layout_and_css_report.md`*

- **Audit Findings**:
  - Investigated multi-step resume creation wizard (Steps 1 to 5).
  - Identified severe page boundary clipping in DOM-to-PDF rendering: section headers and list items broke unevenly across A4 page lines.
  - Excessive nested DOM nodes (`div` soup) in complex two-column templates degraded scrolling performance.
- **Solutions Implemented**:
  - Developed a standardized CSS print engine with strict page-break control (`break-inside: avoid; page-break-after: auto`).
  - Added live layout computation to calculate real printable page heights and display dynamic page-break indicators directly in the editor canvas.
  - Implemented zoom smoothing on the canvas to eliminate jitter when switching between desktop and mobile viewport previews (`plan_fix_canvas_zoom.md`).
  - Standardized font scaling and typography tokens across modern, minimal, technical, and executive templates.

### August 27–31, 2026: Tracker & Ingestion Pipeline Strategy
*References: `docs/TRACKER_AND_SYNC_DOCUMENTATION.md`, `docs/job_intelligence_ingestion_tasks.md`, `docs/BUILD_AI_RESUME_IMPLEMENTATION_PLAN.md`*

- **Job Ingestion Foundations**:
  - Established multi-source aggregation architecture combining direct ATS connectors (Greenhouse, Lever, Ashby) with aggregator adapters (Adzuna, RemoteOK, Remotive, JobSpy).
  - Designed the canonical deduplication pipeline: ATS requisition ID ➔ canonical URL ➔ normalized (company + title + location) fingerprint.
  - Defined the distinction between `firstSeenAt` and `sourcePostedAt` to establish accurate job freshness scoring.
- **Application Tracking System**:
  - Built interactive Kanban board (`saved`, `applied`, `interview`, `offer`, `rejected`).
  - Formulated the Candidate Evidence Engine concept: candidate factual claims are stored as immutable, verified assertions and mapped to tailored CV sections.

---

## 3. September 01–15, 2026: Journey Document Integrity & API Contract Hardening

### September 01–10, 2026: Unified Document Relationship Mapping
*References: `docs/unified_document_relationship_plan.md`, `docs/journey-document-generation-report.md`*

- **The Problem**: Tailored resumes, generated cover letters, and application questions operated on divergent document copies. If a user edited an achievement in their CV, the cover letter referenced outdated metrics.
- **The Implementation**:
  - Implemented `JobJourneySnapshot`: an immutable snapshot linking a specific job requisition to the exact Master CV version, tailored resume ID, cover letter ID, and verified candidate evidence used at application time.
  - Guaranteed auditability: whenever an application is submitted or reviewed, the user can inspect the exact version of the CV attached to that application.

### September 11–16, 2026: API Route Contract Audit & Dead Code Removal
*References: `docs/api-route-contract-audit-2026-09-16.md`, `docs/dead-code-removal-2026-09-16.md`, `docs/ui-fixes-2026-09-16.md`*

- **Contract Audit**:
  - Audited 100+ API endpoints across Next.js App Router for consistent error payload structures (`{ success: false, error: { code, message } }`).
  - Eliminated mixed ID usage where MongoDB `_id` strings and legacy UUIDs caused database query misses (`scan-mixed-id-queries.mjs`).
  - Fixed orphaned UI state where closing a sidebar modal left background scroll locks active.
- **Dead Code Cleanup (Round 1)**:
  - Pruned 34 abandoned experimental components, obsolete mock generators, and duplicate layout stylesheets.
  - Consolidated repetitive chip badge styling into unified dark-theme tokens (`CHIP_INLINE`, `CHIP_TONES_DARK`).

---

## 4. September 16–23, 2026: Phase 1–8 Rollout, Staging Checkpoints & Auth Postmortem

### September 16–19, 2026: Phase 1–8 Verification & Staging Rollout
*References: `docs/PHASE_1_8_COMPLETE.md`, `docs/PHASE_A_PREFLIGHT_AUDIT.md` through `docs/PHASE_D_MIGRATION_RESULTS.md`*

- **Phased Migration**:
  - **Phase A (Preflight)**: Database integrity audit, duplicate document identification, index verification.
  - **Phase B (Staging Checkpoint)**: Automated migration dry-run on staging replica set; verified schema migrations on 10,000+ test records.
  - **Phase C (Migration Dry-Run)**: Re-indexing collections (`users`, `cvs`, `jobs`, `job_applications`), verifying TTL index behavior on verification tokens and session stores.
  - **Phase D (Migration Results)**: Migration executed successfully with zero data loss and sub-millisecond index lookups.

### September 20, 2026: Sign-In Outage Incident Postmortem & Runtime Log Triage
*References: `docs/auth-signin-fix-2026-09-20.md`, `docs/runtime-log-triage-2026-09-20.md`*

- **Incident Summary**: Users experienced intermittent redirect loops and 401 Unauthorized errors during session verification.
- **Root Cause**:
  - A divergence in session cookie resolution between Next.js Edge middleware and Node.js App Router API handlers.
  - Edge middleware looked for `__Secure-next-auth.session-token` while development and non-HTTPS staging environments set `next-auth.session-token`.
  - In addition, an outdated JWT secret fallback (`fallback-secret`) was masked in development but failed when evaluated against strict production environment variables.
- **Resolution**:
  - Standardized session cookie extraction via `src/lib/auth/session-cookie.ts`.
  - Enforced loud failure if `NEXTAUTH_SECRET` is missing in production.
  - Added comprehensive runtime log triage rules to capture uncaught token rejections in Sentry.

### September 21–23, 2026: Dead Code Removal & Apple Login
*References: `docs/dead-code-removal-2026-09-21.md`, `docs/apple-login-setup.md`*

- Cleaned up legacy auth callbacks and unneeded OAuth redirect shims.
- Implemented Apple Sign-In support with private email relay handling and secure key derivation (`apple-login-setup.md`).

---

## 5. September 24–30, 2026: NotiApply Architecture, VPS Mail & Mongo Local Migration

### September 24–27, 2026: NotiApply Architecture Analysis & Automation Pipeline
*References: `docs/application-automation/notiapply-analysis.md`, `docs/application-automation/architecture.md`, `docs/ats-coverage-and-adapter-scoping.md`*

- **Architectural Learnings from NotiApply**:
  - **Deterministic Automation > Pure AI Clicking**: Strict prohibition of "screenshot-to-LLM-clicking" pipelines. Deterministic DOM selector resolution and Shadow DOM inspection are mandatory for form filling. LLMs are reserved strictly for semantic question answering.
  - **Browser Isolation**: Every automation job runs in an isolated, ephemeral browser context (`browser.newContext()`) disposed in `finally` blocks to guarantee no cookie or session leakage between users.
  - **CAPTCHA Safe-Halt**: Zero attempt to bypass anti-bot challenges. Instant pause on challenge detection, transitioning state to `NEEDS_USER_ACTION` with detailed dashboard notifications for the user.
- **Quality Gates**:
  - Pre-submission verification: Candidate identity, verified claims, work authorization check, required file attachments, active job verification.

### September 27–29, 2026: Stalwart Mail Server & Inbound Email Fix
*References: `docs/communication-system/dns-records.md`, `docs/jmap-inbound-body-parts-bug.md`*

- **Stalwart Deployment**:
  - Deployed Stalwart Mail Server on local VPS within an isolated Docker network (`morigrid-net`).
  - Configured DNS with strict SPF, DKIM (RSA 2048), DMARC (`p=reject`), MX, and PTR/rDNS records for `morigrid.com` / `buildairesume.com`.
- **JMAP Inbound Body Bug**:
  - *Symptom*: Inbound recruiter emails were synced with headers and subject lines, but the email body was blank.
  - *Cause*: Stalwart's JMAP response returned `textBody` references containing part IDs (`partId: "1"`), which required explicit `bodyValues` resolution in the JMAP call. The client parser was expecting raw inline text.
  - *Fix*: Updated the JMAP query builder in `src/lib/email/jmap-client.ts` to request `bodyValues` and resolve MIME sub-parts recursively.

### September 29–30, 2026: MongoDB Migration to VPS & Refactor Audit
*References: `docs/mongodb-local-vps-migration.md`, `docs/refactor_audit.md`*

- **Atlas to Local VPS Migration**:
  - Migrated primary MongoDB instance from MongoDB Atlas cloud to self-hosted MongoDB 7.0 on the production VPS.
  - Sub-millisecond local network latency, persistent NVMe storage mounts, automated hourly BSON dumps, and authenticated administrative users.
- **Duplicate Logic Audit**:
  - Cataloged 18 duplicate utility functions across `src/lib` (currency formatters, date relative helpers, ATS slug generators) and consolidated them into shared modules.

---

## 6. October 01–04, 2026: Server Bugs Register, Dokploy Worker & Audit

### October 01–03, 2026: Server Bugs Register (SB-01 to SB-25)
*References: `server_bugs.md`*

- **SB-01 — Token Expiry in Extension Sync**: Handled token refreshing when the Chrome extension communicates with `/api/auth/extension-verify`.
- **SB-05 — Rate Limiting on AI Tailoring**: Introduced Redis/Mongo atomic increments to enforce subscription plan limits on AI resume tailoring and cover letter generation.
- **SB-11 — Application Queue Concurrency Lock**: Added atomic MongoDB `findOneAndUpdate` locking (`lockedAt`, `lockedBy`, `lockedUntil`) to prevent duplicate workers from grabbing the same job application simultaneously.
- **SB-15 — Docs Visibility & Ignore Rules**: Resolved issue where global `.gitignore` patterns swallowed documentation files. Established allowlisting policy for release docs.
- **SB-21 — Mori AI Dock State Desync**: Connected editor canvas selection state with Mori AI floating dock to provide contextual, single-click prompt generation for resume improvements.

### October 04, 2026: Dokploy Worker Migration & Public Release Audit
*References: `docs/deployment/dokploy-worker-migration-plan.md`, `PUBLISH-READINESS.md`*

- Migrated standalone background ingestion microservice (`apps/resumebuilder-worker`) under Dokploy management on port 4001.
- Conducted full publish-readiness audit: sanitized hardcoded test credentials, rotated developer tokens, and established MIT licensing across public repositories.

---

## 7. October 05–06, 2026: Repo Split, KPI Telemetry & Design Modernization

### October 05, 2026 (Evening): Admin Repository Split
- **Workspace Restructure**:
  - Separated the private administrative operations panel into its own dedicated repository at `/Users/amlohsl/Documents/VScode_projects/PROJECTS/cvcircle_admin`.
  - Re-consolidated the user-centric application (`apps/airesume_app`) and ingestion worker (`apps/resumebuilder-worker`) into `AIResume`.
  - Maintained workspace convenience by symlinking `apps/admin -> ../../cvcircle_admin` and gitignoring it in `AIResume`, keeping local builds intact while ensuring zero admin code leaks into public repositories.

### October 05, 2026 (Night): Telemetry KPI Strip Integration & Modernization
- **Job Intelligence Overview Strip**:
  - Integrated the 6-stat Job Intelligence overview KPI strip (`OverviewKPIs.tsx`) into the Admin Overview page (`AdminKPIs.tsx`).
  - Redesigned Row 1 platform KPI cards to match the unified horizontal strip design: single rounded container (`bg-[#111216] border border-white/5 rounded-2xl shadow-xl`), vertical dividers (`divide-x divide-white/5`), 32x32 icon containers, and clean tabular typography.
  - Eliminated jarring solid green card background on Revenue in favor of cohesive dark telemetry styling.

### October 06, 2026: Documentation Consolidation & Master Catalog
- Consolidated 90+ fragmented audits, runbooks, and implementation reports into the structured, authoritative documentation suite:
  - `INDEX.md`: Central hub and role-based reading guide.
  - `DEV_LOGS.md`: Chronological development and incident narrative.
  - `INFRASTRUCTURE.md`: Full infrastructure, VPS, Dokploy, and Stalwart deployment map.
  - `SCHEMA.md`: Complete database collection, field, and relationship architecture.
  - `SITEMAP.md`: Application pages, interactive views, and API endpoint directory.
  - `sensitive.md`: Secret classifications, sanitization guidelines, and rotation protocols.
