# BuildAIResume — Documentation Index & Architecture Hub

Welcome to the central documentation index for **BuildAIResume** (`buildairesume.com`), an AI-powered career platform designed to help candidates navigate the end-to-end career journey:

```
    BUILD  ──►  MATCH  ──►  TAILOR  ──►  APPLY  ──►  TRACK  ──►  LEARN
```

This repository houses the user-facing web application and the job ingestion microservice. This index serves as the master navigation hub linking all consolidated technical references, development histories, infrastructure plans, schemas, and routing specifications.

---

## 1. Consolidated Documentation Suite

| Document | Primary Audience | Description |
| :--- | :--- | :--- |
| **[`DEV_LOGS.md`](file:///Users/amlohsl/Documents/VScode_projects/PROJECTS/AIResume/docs/DEV_LOGS.md)** | All Engineers | Comprehensive chronological development logs, audits, phase rollouts, triage reports, and defect registers from project inception through October 2026. |
| **[`INFRASTRUCTURE.md`](file:///Users/amlohsl/Documents/VScode_projects/PROJECTS/AIResume/docs/INFRASTRUCTURE.md)** | DevOps / Backend | VPS specifications, Dokploy container orchestration, Docker multi-stage builds, self-hosted MongoDB, Stalwart mail server, and background workers. |
| **[`SCHEMA.md`](file:///Users/amlohsl/Documents/VScode_projects/PROJECTS/AIResume/docs/SCHEMA.md)** | Backend / Data | Exhaustive database schema catalog for all MongoDB collections, field types, validation rules, index strategies, and Candidate Evidence Engine principles. |
| **[`SITEMAP.md`](file:///Users/amlohsl/Documents/VScode_projects/PROJECTS/AIResume/docs/SITEMAP.md)** | Frontend / Fullstack | Complete directory of App Router pages, interactive views, API endpoints, NextAuth auth guards, and `src/proxy.ts` middleware logic. |
| **[`sensitive.md`](file:///Users/amlohsl/Documents/VScode_projects/PROJECTS/AIResume/docs/sensitive.md)** | Security / Ops | Security registry for sensitive configuration variables, secret classification, rotation protocols, and sanitization guardrails. |

---

## 2. Product Identity & Core Workflow

BuildAIResume is **not** a simple resume generator or generic chatbot. It is a comprehensive candidate success engine designed to optimize application quality and measurable career outcomes.

### The Six Stages

1. **BUILD (Master CV & Evidence Engine)**:
   - Candidates maintain a single factual source of truth representing their complete professional history: profile, experience, achievements, skills, education, projects, certifications, and portfolio links.
   - The *Candidate Evidence Engine* attributes verified claims (e.g. `Reduced API latency by 38%` linked to `experience.projectA`). The AI reorganizes and rewrites phrasing truthfully, but **never hallucinates** unverified skills, employers, or metrics.
2. **MATCH (Job Discovery & Fit Analysis)**:
   - Aggregates jobs from multiple sources (Greenhouse, Lever, Ashby, Adzuna, Remotive, RemoteOK, LinkedIn, JobSpy).
   - Evaluates Hard Constraints (work authorization, location, mandatory certifications) deterministically before running AI matching.
   - Evaluates Candidate Fit, Opportunity Quality, and Application Readiness independently.
3. **TAILOR (Contextual Optimization)**:
   - Generates tailored CV versions customized to specific job descriptions without fabricating facts.
   - Generates matched cover letters and recruiter outreach copy based on verified candidate evidence.
   - Real-time ATS compatibility scoring and visual formatting in the interactive editor.
4. **APPLY (Execution Modes)**:
   - **AUTO**: High-confidence match (≥90%), supported ATS, verified candidate data, clean deterministic DOM form fill. Safe-halts on CAPTCHA (`NEEDS_USER_ACTION`).
   - **REVIEW**: Prepares all assets, answers custom questions using candidate evidence, and holds for user approval before submission.
   - **MANUAL**: Unsupported portals or complex flows; prepares structured clipboard answers and opens the application URL.
5. **TRACK (Unified Pipeline & Email Sync)**:
   - Interactive Kanban board tracking applications across statuses (`saved`, `applied`, `screening`, `interview`, `offer`, `rejected`, `accepted`).
   - Bidirectional email sync powered by self-hosted Stalwart mail server via JMAP/SMTP.
6. **LEARN (Outcome Intelligence)**:
   - Analyzes response rates, screening rates, and interview conversion broken down by job freshness, ATS, template, and role to iteratively optimize future applications.

---

## 3. Monorepo Architecture

The repository is organized into independent services sharing deployment tooling:

```
AIResume/
├── apps/
│   ├── airesume_app/              # Next.js 16 Web Application (User-Facing)
│   │   ├── src/app/              # App Router pages and API routes
│   │   ├── src/components/       # React UI components (CV editor, tracker, canvas)
│   │   ├── src/models/           # Mongoose schemas & MongoDB interfaces
│   │   ├── src/lib/              # AI providers, ATS parsers, auth, database client
│   │   └── Dockerfile            # Multi-stage image build (targets: runner, worker)
│   ├── resumebuilder-worker/      # Standalone Ingestion Microservice (Port 4001)
│   │   ├── src/                  # Direct ATS pollers (Greenhouse, Lever, Ashby, JobSpy)
│   │   └── Dockerfile            # Container image for worker deployment
│   └── admin/ -> ../../cvcircle_admin # Symlink to separate admin repository
├── deploy/                        # Host infrastructure tooling & Stalwart configuration
├── scripts/                       # Host-level management, LinkedIn worker, VPS probes
└── docs/                          # Consolidated documentation hub
```

---

## 4. Reading Guides by Role

### Frontend Engineers
- Review [`SITEMAP.md`](file:///Users/amlohsl/Documents/VScode_projects/PROJECTS/AIResume/docs/SITEMAP.md) for page hierarchy, modal layouts, dynamic parameters, and query parameters.
- Check [`SCHEMA.md`](file:///Users/amlohsl/Documents/VScode_projects/PROJECTS/AIResume/docs/SCHEMA.md) for `CV` and `JobApplication` structures utilized in the editor and tracker.
- Consult the editor layout section in [`DEV_LOGS.md`](file:///Users/amlohsl/Documents/VScode_projects/PROJECTS/AIResume/docs/DEV_LOGS.md) for canvas zoom, pagination, and Mori AI dock specifications.

### Backend & Data Engineers
- Consult [`SCHEMA.md`](file:///Users/amlohsl/Documents/VScode_projects/PROJECTS/AIResume/docs/SCHEMA.md) for all MongoDB collections, indexing guidelines, and locking mechanisms.
- Review [`INFRASTRUCTURE.md`](file:///Users/amlohsl/Documents/VScode_projects/PROJECTS/AIResume/docs/INFRASTRUCTURE.md) for the queue architecture (`ApplicationQueue`, `ApplicationEmailQueue`) and worker communication.
- Review [`DEV_LOGS.md`](file:///Users/amlohsl/Documents/VScode_projects/PROJECTS/AIResume/docs/DEV_LOGS.md) regarding database migration history and MongoDB split-database recovery procedures.

### DevOps & Infrastructure Specialists
- Read [`INFRASTRUCTURE.md`](file:///Users/amlohsl/Documents/VScode_projects/PROJECTS/AIResume/docs/INFRASTRUCTURE.md) for Dokploy container setup, Stalwart mail server network configuration, and Checkmate monitoring.
- Read [`sensitive.md`](file:///Users/amlohsl/Documents/VScode_projects/PROJECTS/AIResume/docs/sensitive.md) for secret management, credential rotation procedures, and sanitization checklists.
- Follow deployment runbooks in `deploy/` and verification scripts in `scripts/`.
