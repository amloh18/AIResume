# NotiApply Architecture Analysis & BuildAIResume Integration Strategy

This document provides a comprehensive technical comparison between **NotiApply** (a desktop-oriented Rust/Tauri job pipeline) and **BuildAIResume** (a production web platform with VPS/Docker backend). Each core capability is evaluated to establish clear architectural recommendations.

---

## 1. Multi-Tier Job Discovery

### NotiApply approach
NotiApply uses a 4-tier Python scraping architecture:
- **Tier 1**: Aggregator polling (`jobspy` for LinkedIn, Indeed, Glassdoor, ZipRecruiter) at single-user request rates.
- **Tier 2**: Direct ATS JSON API ingestion (Greenhouse, Lever, Ashby public board endpoints).
- **Tier 3**: GitHub API Markdown table parsing.
- **Tier 4**: `Scrapling` + `Camoufox` browser-fingerprint spoofing for Cloudflare-protected job boards (e.g., Wellfound) without paid proxies.

### Current BuildAIResume approach
BuildAIResume operates a multi-tiered ingestion infrastructure:
- Microservice `buildairesume-job-ingestion` container running polling for Adzuna, Remotive, RemoteOK, and JobSpy.
- Python `scripts/jobspy-worker.py` for aggregated search.
- Headless `scripts/linkedin-worker` Playwright script for user-authenticated LinkedIn job discovery and snapshotting.
- Stored directly in MongoDB `Job` and `JobDemand` collections with deduplication on `jobUrl` and `(title + company)`.

### Recommendation
**ADAPT**

### Reason
BuildAIResume already possesses a powerful ingestion fleet. Adapting NotiApply's direct ATS ingestion (Tier 2: Greenhouse, Lever, Ashby public JSON endpoints) and Scrapling patterns into BuildAIResume's existing ingestion service provides high-fidelity ATS direct links without paying for proxy networks or third-party APIs.

### Implementation impact
- Extend `buildairesume-job-ingestion` and API routes to poll direct ATS boards (Greenhouse `/v1/boards/{company}/jobs`, Lever `/v0/postings/{company}`, Ashby).
- Preserve existing MongoDB `Job` schema and deduplication pipeline.

---

## 2. Local-First Data Sovereignty

### NotiApply approach
NotiApply runs exclusively on the user's desktop machine via Tauri, with a local SQLite/PostgreSQL database. No user data, API keys, or application traces are transmitted to cloud multi-tenant servers.

### Current BuildAIResume approach
BuildAIResume is self-hosted on the user's dedicated VPS using Docker and Dokploy. MongoDB is hosted locally on the VPS, Next.js handles server actions, and Cloudflare acts as an edge proxy.

### Recommendation
**ADAPT**

### Reason
BuildAIResume provides VPS-level data ownership. All automation workers, Playwright browser instances, MongoDB records, and email daemons run on the user's VPS. User resumes and credentials never leave the VPS environment.

### Implementation impact
- Ensure all automation workers run locally in the Docker/VPS environment.
- Enforce strict internal Docker network bindings so databases and worker endpoints are never exposed publicly.

---

## 3. Tailored Resume & Document Generation

### NotiApply approach
NotiApply utilizes a LaTeX template (`master.tex`) with `% SKILLS_INJECT_POINT` markers. An LLM generates tailored bullet points, and the self-contained `Tectonic` engine compiles the document to a PDF file on disk.

### Current BuildAIResume approach
BuildAIResume features a rich Master CV database (`src/models/CV.ts`) with 10+ visual layouts, AI tailoring via Google Gemini API (producing structured JSON), real-time ATS match scoring, and HTML/canvas/react-pdf document rendering with cloud/local attachment storage.

### Recommendation
**KEEP CURRENT**

### Reason
BuildAIResume's interactive resume editor, real-time live preview, and multi-template styling are significantly more powerful and user-friendly for non-technical users than rigid LaTeX templates.

### Implementation impact
- No changes to BuildAIResume's CV editor or Gemini tailoring engine.
- Provide a standardized headless PDF export service endpoint that the Playwright automation worker can fetch for form attachments.

---

## 4. Playwright Sidecar / Automation Execution

### NotiApply approach
NotiApply spawns a dedicated Node.js process (`fill.js`) per application. The sidecar interacts with target ATS portals using Playwright, communicates via NDJSON on stdout back to the host, and executes deterministic form field filling.

### Current BuildAIResume approach
BuildAIResume has `scripts/linkedin-worker` and Python background scripts, with MongoDB `ApplicationQueue` and `ApplicationJourney` tracking job stages, but previously lacked a dedicated deterministic multi-ATS Playwright filling worker.

### Recommendation
**ADAPT**

### Reason
NotiApply's Playwright sidecar architecture is exceptionally robust. Packaging this as a dedicated local VPS worker service (Node.js/Playwright) triggered by BuildAIResume's `ApplicationQueue` provides modular, deterministic automation without risking the main Next.js server.

### Implementation impact
- Create `src/services/automation/worker/` (or standalone worker process) with Playwright Chromium.
- Connect the worker to MongoDB's `ApplicationQueue` with atomic locks and status updates.

---

## 5. Deterministic Form Automation (DOM & Shadow DOM)

### NotiApply approach
NotiApply explicitly avoids "pure AI click agents" (which are slow, expensive, and fragile). Instead, it inspects the DOM and Shadow DOM, maps standard form fields (First Name, Last Name, Email, Phone, LinkedIn, Portfolio, Resume File, Cover Letter), selects dropdown options deterministically, and only queries an LLM when semantic interpretation of custom questions is needed.

### Current BuildAIResume approach
BuildAIResume currently guides users through the CV Journey and application tracker, generating tailored materials and providing direct application URLs.

### Recommendation
**ADAPT**

### Reason
Deterministic DOM automation provides 99%+ consistency, sub-second execution speeds, and zero AI hallucination on standard form inputs (e.g. name, email, resume file upload). AI should be reserved exclusively for semantic question answering.

### Implementation impact
- Implement dedicated ATS form-filling handlers for Greenhouse (`boards.greenhouse.io`), Lever (`jobs.lever.co`), Ashby (`jobs.ashbyhq.com`), and Workday (`myworkdayjobs.com`).
- Implement generic semantic form-filling fallback for other standard web forms.

---

## 6. Supported ATS Integration

### NotiApply approach
NotiApply implements specialized selectors and lifecycle steps for major ATS platforms:
- **Greenhouse**: Single-page form with standard input IDs (`first_name`, `last_name`, `email`, `phone`, file attachments, custom question containers).
- **Lever**: Simple standard form with resume parse trigger, social link fields, and text areas.
- **Ashby**: Modern React/Shadow DOM interface with dynamic question components.

### Current BuildAIResume approach
BuildAIResume tracks ATS types in `JobApplication.ts` (`greenhouse | lever | workable | naukri | indeed | adzuna | ashby | workday | unknown`) and provides job metadata and application link detection.

### Recommendation
**ADAPT**

### Reason
Specialized ATS handlers ensure near-100% submission success on the most prevalent tech hiring platforms while maintaining clean fallbacks for custom forms.

### Implementation impact
- Implement modular ATS adapters (`GreenhouseAdapter`, `LeverAdapter`, `AshbyAdapter`, `GenericAdapter`) adhering to a common `IATSAdapter` interface.

---

## 7. Unknown-Field Handling & Schema Validation

### NotiApply approach
When the Playwright worker encounters mandatory form fields that cannot be matched to known standard attributes (e.g., specific demographic questionnaires, custom company assessment prompts, unexpected dropdowns), it halts execution, captures form state and field metadata, and signals for manual review.

### Current BuildAIResume approach
BuildAIResume's `ApplicationJourney` tracks completion states and displays missing info in the application drawer.

### Recommendation
**ADAPT**

### Reason
Blindly guessing on mandatory employment questions or legal attestations can result in immediate disqualification. Halting safely on unknown mandatory fields preserves applicant integrity.

### Implementation impact
- Implement `UnknownFieldDetector` that identifies unmatched required inputs.
- Transition application state to `NEEDS_USER_ACTION` with precise field descriptors and screenshot context in the dashboard.

---

## 8. CAPTCHA / Anti-Bot & Manual Intervention Handling

### NotiApply approach
NotiApply follows a strict principle: **No automated CAPTCHA bypassing**. If Cloudflare Turnstile, reCAPTCHA, or hCaptcha is detected, the sidecar suspends automation, keeps the browser context alive, alerts the user to complete the challenge manually, and resumes automation upon completion.

### Current BuildAIResume approach
BuildAIResume complies with ethical guidelines and avoids unauthorized security evasion.

### Recommendation
**ADOPT**

### Reason
Respecting anti-bot boundaries ensures IP health, avoids terms-of-service violations, and prevents automated application bans.

### Implementation impact
- Detect CAPTCHA iframes / elements in Playwright.
- On detection, pause the queue item, set status to `NEEDS_USER_ACTION`, and provide a direct manual-completion bridge in the dashboard.

---

## 9. Job & Application State Machine

### NotiApply approach
NotiApply uses a 5-state pipeline (`DISCOVERED` -> `MATCHED` -> `PREPARING` -> `QUEUED` -> `SUBMITTED` / `FAILED`).

### Current BuildAIResume approach
BuildAIResume already has an established tracking system in `JobApplication` (`saved`, `created`, `applied`, `screening`, `interview`, `offer`, `rejected`, `accepted`, `withdrawn`) and `ApplicationJourney` (`in-progress`, `processing_documents`, `ready`, `completed`, `paused`, `creation_failed`).

### Recommendation
**ADAPT (Preserve Existing State Machine + Add Automation Sub-States)**

### Reason
We must never break existing user dashboards or tracking statistics. We will enhance the existing state model by introducing automation execution statuses in `ApplicationQueue` and `ApplicationRun` while preserving the primary `JobApplication` status lifecycle.

### Implementation impact
- Retain existing `JobApplication.status` enum (`saved`, `applied`, `interview`, etc.).
- Use `ApplicationQueue.status` (`queued`, `running`, `needs_user_action`, `submitted`, `failed`, `cancelled`) for background automation execution.

---

## 10. Worker Isolation & Runtime Lifecycle

### NotiApply approach
Spawns a fresh headless Node process per job (`one job per invocation`) with ephemeral browser context, ensuring memory leaks and corrupted session cookies never pollute subsequent runs.

### Current BuildAIResume approach
`scripts/jobspy-worker.py` and `scripts/linkedin-worker` run as distinct subprocesses/services.

### Recommendation
**ADOPT**

### Reason
Per-job browser context isolation guarantees zero cross-user credential leakage, prevents memory accumulation on the VPS, and ensures one failing application cannot crash concurrent jobs.

### Implementation impact
- Ensure the Playwright worker creates a fresh `browser.newContext()` per job and always disposes it in a `finally` block.

---

## 11. Queue Execution & Concurrency Control

### NotiApply approach
NotiApply uses n8n to dispatch jobs to a single local runner container sequentially or with low concurrency.

### Current BuildAIResume approach
BuildAIResume has `ApplicationQueue.ts` in MongoDB with `priority`, `scheduledAt`, `lockedAt`, `lockedBy`, and `idempotencyKey` fields.

### Recommendation
**ADAPT (Native MongoDB Queue Worker)**

### Reason
BuildAIResume's MongoDB-backed `ApplicationQueue` provides native distributed locking, retry scheduling, and priority queuing without requiring the operational overhead of a separate n8n service.

### Implementation impact
- Implement atomic MongoDB locking (`findOneAndUpdate({ status: 'queued', lockedAt: null })`) in the automation worker loop with configurable concurrency (e.g. 2–3 concurrent browser contexts on VPS).

---

## 12. Local Email Infrastructure (Stalwart vs Paid APIs)

### NotiApply approach
NotiApply does not include an email server; it is strictly a desktop application.

### Current BuildAIResume approach & Target Goal
BuildAIResume currently supports `nodemailer` with external SMTP credentials. We are deploying **Stalwart Mail Server** as a native Docker service on the VPS to enable free, private, self-hosted SMTP email sending without recurring third-party API costs (SendGrid, Mailgun, Postmark).

### Recommendation
**NEW IMPLEMENTATION (Stalwart Docker Deployment)**

### Reason
Deploying Stalwart on the VPS gives BuildAIResume complete email autonomy, internal Docker network security (`stalwart:587`), and zero cost per email.

### Implementation impact
- Deploy Stalwart container in Docker Compose on internal network.
- Configure DKIM, SPF, DMARC, and TLS.
- Wire `src/lib/email-service.ts` to route transactional and application emails through internal Stalwart SMTP.

---

## Summary Matrix

| Capability | NotiApply Approach | BuildAIResume Approach | Action |
| :--- | :--- | :--- | :--- |
| **Job Discovery** | 4-Tier Python scrapers | Ingestion service + JobSpy | **ADAPT** ATS direct JSON endpoints |
| **Data Privacy** | Local SQLite/Postgres | Local VPS MongoDB | **KEEP CURRENT** (VPS Data Sovereignty) |
| **Resume Builder** | LaTeX + Tectonic CLI | Interactive Canvas + Gemini AI | **KEEP CURRENT** (Superior UI/Editor) |
| **Browser Automation** | Playwright sidecar (fill.js) | Manual / Assisted URLs | **ADAPT** Playwright Automation Worker |
| **Form Filling** | Deterministic DOM/Shadow DOM | Template extraction | **ADAPT** Deterministic ATS filling |
| **ATS Integrations** | Greenhouse, Lever, Ashby | Metadata & Link detection | **ADAPT** Dedicated ATS Adapters |
| **Unknown Fields** | Halts for manual review | Manual drawer | **ADAPT** Safe Halt & Review Bridge |
| **CAPTCHA Handling** | Halts; no bypass | Ethical adherence | **ADOPT** Strict Halt & User Alert |
| **State Machine** | 5-state pipeline | ApplicationJourney + Tracker | **ADAPT** Unified sub-states |
| **Worker Isolation** | Per-job ephemeral process | Subprocesses | **ADOPT** Ephemeral browser contexts |
| **Queueing** | n8n workflow | MongoDB ApplicationQueue | **ADAPT** Atomic MongoDB queue runner |
| **Email Server** | None (desktop app) | External SMTP | **NEW** Local Stalwart Mail Server on VPS |
