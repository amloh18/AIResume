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
| Observability | **Sentry**, **PostHog**, structured logs | Error tracking and product analytics. |
| Testing | **Vitest** | Fast unit and integration runs. |
| Runtime | **Node.js 22** | Pinned via `engines`. |
| Infra | **Docker**, **Dokploy**, **Traefik**, **Cloudflare** | Self-managed deployment; we are not tied to a PaaS. |
| Object storage | **S3-compatible** (R2) | Generated documents and user files stay out of the database. |

## Architecture

This repository is the web application. It ships as **two containers built from one image**: a `runner` target serves the web tier, and a `worker` target runs the background loops — email delivery, inbound mail ingestion, the application queue and the reconciliation watchdog. We split them because redeploying the website used to kill those loops mid-flight.

```
   job sources ──────────────▶┌─────────────────┐
   (aggregator APIs,          │    MongoDB      │
    direct ATS ingestion)     └────────┬────────┘
                                      │ reads
                                      ▼
   browser ───────────▶┌──────────────────────────────┐
                       │  app (Next.js)               │
                       │  BUILD · MATCH · TAILOR ·    │
                       │  APPLY · TRACK · LEARN       │
                       │  web tier │ background worker│
                       └──────────────────────────────┘
```

Job ingestion is a **separate service** (the `resumebuilder-worker` project). It owns the source adapters, normalisation, deduplication and its own distributed-locked scheduler; this application only reads what it writes. That keeps the web tier free of Python, Chromium and scraping dependencies — jobs flow one way.

Two rules are load-bearing and easy to break:

- **`src/proxy.ts` is the auth middleware.** Next 16 renamed `middleware` to `proxy`. It has zero importers, so deleting it silently drops route protection with no build, lint or test failure.
- **Master CV is enforced after the model runs** (`repairTailoredCv`), not by prompt instruction alone.

## Repository structure

```
.
├── src/
│   ├── app/                  # routes, server components, API handlers
│   ├── components/           # UI, including the resume editor
│   ├── lib/                  # domain logic: scoring, tailoring, ATS, auth
│   ├── models/               # Mongoose schemas
│   └── workers/              # background loops bundled into the worker image
├── scripts/                  # migrations, backfills, imports, admin tooling
├── public/                   # static assets, including the served SEO files
├── docs/                     # user-facing documentation
├── Dockerfile                # builds this app's `runner` and `worker` targets
└── .env.example              # the annotated list of every variable we read
```

> The **admin panel is a separate, private project.** Its source is intentionally not part of this repository. It reuses this app's code by inverting the `@/` path alias in its own build, which is why the imports here need no special handling.

## Getting started

### Prerequisites

- **Node.js 22** — pinned in `engines`.
- **MongoDB** — 6.0 or newer. A local instance or a hosted cluster both work.
- **Docker** — optional, only if you want to run the container images.

No Python and no Chromium are required for the web tier. PDF rendering and ATS automation talk to remote services over CDP/HTTP.

### Run it locally

```bash
git clone https://github.com/<you>/AIResume.git
cd AIResume

cp .env.example .env.local        # fill in your own values
npm ci --legacy-peer-deps
npm run dev                       # http://localhost:3000
```

`--legacy-peer-deps` is not incidental — it is what our production image uses, and an install without it can resolve a different dependency tree.

## Environment configuration

**All configuration lives in environment files, and only the template is committed.** Nothing sensitive is hardcoded in the source. `.env.example` is the authoritative annotated list; [`docs/configuration.md`](docs/configuration.md) explains what each variable does.

```bash
cp .env.example .env.local
```

Three rules that will cost you an afternoon if you get them wrong:

| Rule | Why it matters |
| --- | --- |
| **A build must never need a runtime secret.** | If a build starts demanding one, that is a regression, not a setup step. |
| **`WORKER_ROLE=web` on the web service, and never on the worker.** | Without it the web container starts the background loops itself, and every redeploy interrupts them. |
| **Cron fails closed.** | With no `CRON_SECRET` and no `CRON_API_KEY`, every `/api/cron/*` route returns `503` rather than running unauthenticated. |

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Development server on :3000 |
| `npm run build` | Production build (needs a 4 GB heap) |
| `npm run start` | Serve the production build |
| `npm test` | Vitest, single run |
| `npm run test:watch` | Vitest, watch mode |
| `npm run type-check` | `tsc --noEmit` |
| `npm run lint` | ESLint over the source tree |
| `npm run build:worker` | Bundle the background worker to `dist/worker.mjs` |
| `npm run worker` | Bundle and run the background worker locally |
| `npm run db:indexes` | Create the job indexes |

Operational scripts under `scripts/` (`migrate:*`, `backfill:*`, `import:*`, `admin:*`) run through `npx tsx` and expect the same environment as the app.

## Testing

```bash
npm test
```

We use **Vitest**. Two things are worth knowing before you read the output:

- **The suite currently exits 1 on 5 pre-existing failures.** They are real, they are known, and we would rather show them than hide them. The CI workflow reports the test step without failing the build until they are cleared — see [`.github/workflows/ci.yml`](.github/workflows/ci.yml) for why, and remove that once the suite is green.
- **`npm run type-check` is not yet a clean signal.** The tree type-checks in slices (`tsconfig.chips.json`, `tsconfig.pipeline.json`, `tsconfig.portal.json`) because a repo-wide run is slow and noisy. The production `next build` is the type gate that currently holds.

## Deployment

We deploy to a self-managed VPS with Docker and Dokploy. The build context is **this repository's root** — the `Dockerfile` here produces both targets:

```bash
docker build --target runner .    # the Next.js web tier (the default)
docker build --target worker .    # the app's background loops
```

The runtime stages copy the application to `/app`, because several route handlers resolve paths against `process.cwd()` — so the working directory must keep containing `public/`, `package.json` and `node_modules/`.

The worker tier is a separate container on purpose: redeploying the web tier must not interrupt email delivery, inbound mail ingestion, the application queue or the reconciliation watchdog.

To run your own instance, start with **[docs/self-hosting.md](docs/self-hosting.md)**; the variables are listed in **[docs/configuration.md](docs/configuration.md)**.

## Security

- We never commit secrets. Only `.env.example` is tracked, and it contains placeholders.
- A published verification token is an ownership proof, not an analytics id — the site-verification tokens are read from the environment rather than hardcoded.

Please read **[SECURITY.md](SECURITY.md)** before reporting a vulnerability. Do not open a public issue for a security problem.

## Roadmap

- Clear the 5 pre-existing test failures and make `npm test` a blocking gate.
- Consolidate the sliced type-check configs into a single clean `tsc --noEmit`.
- Extend deterministic ATS coverage beyond the four platforms we support today.
- Generate per-article social cards for the blog instead of hotlinking stock imagery.
- Expand the evidence model so a claim can carry a verification state, not just a source.

## Contributing

We welcome contributions — bug reports, fixes and features alike. **[CONTRIBUTING.md](CONTRIBUTING.md)** has the detail; the short version:

1. **Never commit a secret.** If you are unsure whether something is sensitive, it is.
2. **Keep a change focused.** One concern per pull request.
3. **Explain why, not just what.** Say what could break.

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md).

## License

Released under the **[MIT License](LICENSE)**. You are free to use, modify and distribute this software, including commercially, provided the copyright notice and permission notice are retained.

## Acknowledgements

AIResume is built on the work of others. We are particularly grateful to the Next.js, React, MongoDB, Mongoose, Playwright, Tailwind CSS, Radix UI and Vitest teams, and to the maintainers of the job-source APIs and open job datasets that make multi-source discovery possible.
