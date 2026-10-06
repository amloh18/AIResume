# AIResume

**An AI-powered career platform that takes a job seeker from an empty page to a tracked application — and learns from the outcome.**

We built AIResume because the tools people actually use are fragmented: a resume builder here, a job board there, a spreadsheet to track applications, and a different chat window for every cover letter. AIResume runs the whole loop in one place, on top of one source of truth for the candidate's real experience.

```
BUILD  →  MATCH  →  TAILOR  →  APPLY  →  TRACK  →  LEARN
```

[![License: MIT](https://img.shields.io/badge/License-MIT-013f2e.svg)](LICENSE)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-000000.svg)](https://nextjs.org)
[![React 19](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev)
[![Node 22](https://img.shields.io/badge/Node-22-5fa04e.svg)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose%208-47a248.svg)](https://www.mongodb.com)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-013f2e.svg)](CONTRIBUTING.md)

---

## Table of contents

- [What we built](#what-we-built)
- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Repository structure](#repository-structure)
- [Getting started](#getting-started)
- [Environment configuration](#environment-configuration)
- [Scripts](#scripts)
- [Testing](#testing)
- [Deployment](#deployment)
- [Security](#security)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## What we built

Most resume tools generate a document. We wanted to build the workflow around it — because the document is the smallest part of getting hired.

Three design decisions shaped everything else:

**The Master CV is the single source of truth.** We store a candidate's real professional history once — roles, achievements, skills, education, projects, certifications — and every downstream artifact is derived from it. Our AI is allowed to reorganise, prioritise, summarise and rephrase that evidence. It is not allowed to invent it. When a job posting asks for something the candidate's record does not contain, the pipeline stops and asks rather than filling the gap with something plausible. That constraint is enforced after the model runs, not merely requested in a prompt.

**The output has to survive an ATS.** A beautifully typeset PDF that a parser cannot read is worthless. Every resume we produce is scored against the target posting and checked for machine-readability, so the thing a human sees is also the thing the software sees.

**Applying should be measurable.** We treat an application as a tracked object with a lifecycle, not a one-off send. That is what makes the final stage of the loop possible: comparing what actually got responses against what did not.

## Features

### Build

- **Interactive resume editor** — a live, structured editor rather than a form that spits out a PDF.
- **Master CV** — the authoritative career record that every application is tailored from.
- **Multiple visual templates** — switch layout without re-entering data.
- **Live preview and export** — client-rendered thumbnails, with server-side rendering for the final document.

### Match

- **Multi-source job discovery** — aggregator APIs and direct ATS ingestion, normalised into one job shape.
- **Job matching** — candidates are matched against ingested demand, not just a keyword search.
- **Deduplication by canonical job identity**, so the same posting arriving from two sources is one job.

### Tailor

- **AI tailoring per job** — the resume is re-prioritised and rephrased for a specific posting, using only the candidate's own evidence.
- **ATS optimisation and scoring** — an explicit, inspectable score against the posting.
- **Cover letters and application emails** — generated from the same evidence base.

### Apply

- **Manual, assisted and automated application paths** — the candidate chooses how much to delegate.
- **Deterministic browser automation** for supported ATS platforms (Greenhouse, Lever, Ashby, Workable), built on Playwright with DOM-based form detection.
- **Safe halts** — CAPTCHA, an unexpected form or a failed validation stops the run and hands control back to the user instead of guessing.
- **Application queueing with job isolation** — one ephemeral browser context per application, so a failure cannot contaminate the next run.

### Track

- **Application tracking** — every application is an object with a stage history, documents and events.
- **Inbound email ingestion** — replies are pulled into the application record so the status updates itself.
- **Analytics** — funnel, source and outcome reporting across the pipeline.

### Platform

- **Bring-your-own AI provider** — Google Gemini by default, with OpenAI-compatible endpoints and a local Ollama fallback.
- **Self-hosted email infrastructure** — outbound SMTP plus inbound mail over JMAP.
- **Payments and subscriptions** — Razorpay (default) and Stripe, with region-aware pricing.

## Tech stack

| Layer | What we use | Why |
| --- | --- | --- |
| Framework | **Next.js 16** (App Router), **React 19** | Server components for data-heavy pages, one runtime for UI and API. |
| Language | **TypeScript 5** | The pipeline is long enough that types are cheaper than debugging. |
| Database | **MongoDB** with **Mongoose 8** | The domain is document-shaped: a candidate's evidence, a tailored CV and a job posting are all nested, variable structures. |
| Styling | **Tailwind CSS 3**, **Radix UI**, shadcn-style primitives | Consistent tokens across a large surface area without a heavyweight component library. |
| Auth | **NextAuth** | Email/password, Google, LinkedIn and Apple. |
| Automation | **Playwright** | Deterministic form filling against ATS DOMs. |
| AI | **Google GenAI**, OpenAI-compatible APIs, **Ollama** | Provider-agnostic by design; the pipeline should not be tied to one vendor. |
| Charts | **Recharts** | Analytics and reporting. |
| Motion | **Framer Motion** | Editor and dashboard transitions. |
| Mail | **Nodemailer** + **Stalwart** (JMAP) | Outbound and inbound mail on infrastructure we control. |
| Payments | **Razorpay**, **Stripe** | Razorpay first for India, Stripe elsewhere. |
| Observability | **Sentry**, **PostHog**, structured logs | Error tracking, product analytics. |
| Testing | **Vitest** | Fast unit and integration runs. |
| Runtime | **Node.js 22** | Pinned via `engines`. |
| Infra | **Docker**, **Dokploy**, **Traefik**, **Cloudflare** | Self-managed deployment; we are not tied to a PaaS. |
| Object storage | **S3-compatible** (R2) | Generated documents and user files stay out of the database. |

## Architecture

AIResume is a monorepo of independently deployable projects. We deliberately did **not** use npm workspaces: the projects share no code, deploy from different build contexts, and run on different base images. Coupling them through a hoisted root `node_modules` would buy deduplication that never happens while making every deploy depend on the other project's install.

```
                      ┌──────────────────────────────┐
   job sources ──────▶│  resumebuilder-worker        │
   (Adzuna, Remotive, │  adapters → normalise →      │
    RemoteOK, JobSpy, │  deduplicate → scheduler     │
    LinkedIn, ATSes)  └──────────────┬───────────────┘
                                     │ writes
                                     ▼
                            ┌─────────────────┐
                            │    MongoDB      │
                            └────────┬────────┘
                                     │ reads
                                     ▼
   browser ───────────▶┌──────────────────────────────┐
                       │  airesume_app (Next.js)      │
                       │  BUILD · MATCH · TAILOR ·    │
                       │  APPLY · TRACK · LEARN       │
                       │  web tier │ background worker│
                       └──────────────────────────────┘
                                     ▲
                       ┌─────────────┴───────────────┐
                       │  admin (private, separate)  │
                       └─────────────────────────────┘
```

**The app ships as two containers from one image.** A `runner` target serves the web tier and a `worker` target runs the background loops — email delivery, inbound mail ingestion, the application queue and the reconciliation watchdog. We split them because redeploying the website used to kill those loops mid-flight.

**Jobs flow one way.** The ingestion service owns source adapters, normalisation, deduplication and its own distributed-locked scheduler. The app only reads. That keeps the web tier free of Python, Chromium and scraping dependencies.

## Repository structure

```
.
├── apps/
│   ├── airesume_app/               # the Next.js application (public)
│   │   ├── src/app/                # routes, server components, API handlers
│   │   ├── src/components/         # UI, including the resume editor
│   │   ├── src/lib/                # domain logic: scoring, tailoring, ATS, auth
│   │   ├── src/models/             # Mongoose schemas
│   │   ├── src/workers/            # background loops bundled into the worker image
│   │   ├── scripts/                # migrations, backfills, imports
│   │   ├── public/                 # static assets
│   │   └── .env.example            # the annotated list of every variable we read
│   ├── resumebuilder-worker/       # the job-ingestion service (public, own VPS)
│   └── admin/                      # the operations panel (PRIVATE — maintained separately)
├── deploy/                         # deployment configuration
├── scripts/                        # host/VPS tooling
├── Dockerfile                      # builds the app's `runner` and `worker` targets
└── LICENSE
```

> The **admin panel** is maintained in a separate **private** repository (`amloh18/AIResume_admin`). Its source is intentionally not part of this repository.

## Getting started

### Prerequisites

- **Node.js 22** — the projects pin `22.x` in `engines`.
- **MongoDB** — 6.0 or newer. A local instance or a hosted cluster both work.
- **Docker** — optional, only if you want to run the container images.

No Python and no Chromium are required for the web tier. PDF rendering and ATS automation talk to remote services over CDP/HTTP.

### Run it locally

```bash
git clone https://github.com/amloh18/CVCircle_app.git AIResume
cd AIResume

# 1. the web application
cd apps/airesume_app
cp .env.example .env.local        # fill in your own values
npm ci --legacy-peer-deps
npm run dev                       # http://localhost:3000
```

`--legacy-peer-deps` is not incidental — it is what our production image uses, and an install without it can resolve a different dependency tree.

```bash
# 2. the job-ingestion service (optional, separate terminal)
cd apps/resumebuilder-worker
cp .env.example .env
npm ci
npm run dev                       # http://localhost:4001/health
```

The repository root carries a thin task runner that delegates to both projects:

```bash
npm run dev           # → apps/airesume_app dev server
npm run build         # → apps/airesume_app production build
npm run build:worker  # → bundle the app's background worker
npm run test          # → apps/airesume_app test suite
npm install:all       # → npm ci in every project
```

## Environment configuration

**All configuration lives in environment files, and only the templates are committed.** Nothing sensitive is hardcoded in the source. `apps/airesume_app/.env.example` is the authoritative annotated list.

```bash
cp apps/airesume_app/.env.example apps/airesume_app/.env.local
```

Three rules that will cost you an afternoon if you get them wrong:

| Rule | Why it matters |
| --- | --- |
| **A build must never need a runtime secret.** | If a build starts demanding one, that is a regression, not a setup step. |
| **`WORKER_ROLE=web` on the web service, and never on the worker.** | Without it the web container starts the background loops itself, and every redeploy interrupts them. |
| **Cron fails closed.** | With no `CRON_SECRET` and no `CRON_API_KEY`, every `/api/cron/*` route returns `503` rather than running unauthenticated. |

## Scripts

Each project is self-contained. The app's scripts:

| Script | What it does |
| --- | --- |
| `npm run dev` | Development server on :3000 |
| `npm run build` | Production build (needs a 4 GB heap) |
| `npm run start` | Serve the production build |
| `npm run test` | Vitest, single run |
| `npm run type-check` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run build:worker` | Bundle the background worker to `dist/worker.mjs` |

Operational scripts under `apps/airesume_app/scripts/` (`migrate:*`, `backfill:*`, `import:*`) run through `npx tsx` and expect the same environment as the app.

## Testing

```bash
cd apps/airesume_app && npm test
```

## Deployment

We deploy to a self-managed VPS with Docker and Dokploy. Two independent builds:

```bash
# the app — context is the REPOSITORY ROOT, not apps/airesume_app
docker build --target runner .    # the Next.js web tier
docker build --target worker .    # the background loops

# the ingestion service — context is its own directory
docker build -t resumebuilder-worker apps/resumebuilder-worker
```

The app's runtime stages flatten `apps/airesume_app` back to `/app`, because several route handlers resolve paths against `process.cwd()`.

## Security

- We never commit secrets. Only `.env.example` templates are tracked, and they contain placeholders.
- Internal documentation and runtime configurations are kept out of public branches.

Please read **[SECURITY.md](SECURITY.md)** before reporting a vulnerability. Do not open a public issue for a security problem.

## Contributing

See **[CONTRIBUTING.md](CONTRIBUTING.md)**. The short version:

1. **Never commit a secret.** If you are unsure whether something is sensitive, it is.
2. **Keep a change focused.** One concern per pull request.
3. **Explain why, not just what.** Say what could break.

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md).

## License

Released under the **[MIT License](LICENSE)**. You are free to use, modify and distribute this software, including commercially, provided the copyright notice and permission notice are retained.

## Acknowledgements

AIResume is built on the work of others. We are particularly grateful to the Next.js, React, MongoDB, Mongoose, Playwright, Tailwind CSS, Radix UI and Vitest teams, and to the maintainers of the job-source APIs and open job datasets that make multi-source discovery possible.
