# resumebuilder-worker

**The job-ingestion service behind AIResume — it turns a dozen inconsistent job sources into one clean, deduplicated collection of postings.**

[![License: MIT](https://img.shields.io/badge/License-MIT-013f2e.svg)](LICENSE)
[![Node 22](https://img.shields.io/badge/Node-22-5fa04e.svg)](https://nodejs.org)
[![TypeScript 5](https://img.shields.io/badge/TypeScript-5-3178c6.svg)](https://www.typescriptlang.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose%208-47a248.svg)](https://www.mongodb.com)

---

## What we built

Job data on the open web is a mess. Every aggregator uses its own field names, its own idea of what a salary looks like, and its own notion of whether a posting is still open. The same role is listed on four boards under three different titles, and the only one carrying a usable apply URL is the company's own ATS.

We wrote this service so that problem is solved **once, upstream**, instead of being re-solved badly in the UI:

```
sources ──▶ adapters ──▶ normalise ──▶ fingerprint ──▶ deduplicate ──▶ MongoDB
                                                                        │
                                                        the web app reads ┘
```

It is a standalone deployable. It owns its source adapters, its normalisation rules, its deduplication and its own distributed-locked scheduler. It writes; the application only reads.

## Why it is a separate service

- **The web tier stays light.** No Python, no Chromium, no scraping dependencies in the container that serves users.
- **Failure is contained.** A source that starts returning garbage, or a scraper that gets rate-limited, degrades ingestion — not the product.
- **It scales independently.** Ingestion is bursty and CPU-bound; serving pages is not.
- **The contract is one collection.** The application never learns where a job came from beyond the fields this service guarantees.

## Sources

Each source is an adapter that normalises into a shared job shape before it reaches deduplication, so adding one never touches the consumers.

| Source | Kind | Notes |
| --- | --- | --- |
| **Greenhouse** | Direct ATS | Canonical apply URL and the most reliable metadata. |
| **Lever** | Direct ATS | Preferred where available. |
| **Ashby** | Direct ATS | Preferred where available. |
| **Workday** | Direct ATS | Tenant-scoped career sites. |
| **Adzuna** | Aggregator API | Requires `ADZUNA_APP_ID` / `ADZUNA_APP_KEY`. |
| **Remotive** | Aggregator API | Remote-first roles. |
| **RemoteOK** | Aggregator API | Remote-first roles. |
| **JobSpy** | Scraper worker | Talks to an out-of-process worker over HTTP. |

Direct ATS sources are preferred wherever practical, because they carry the canonical apply URL — the single field that determines whether an application can be automated at all.

## Tech stack

| Layer | What we use | Why |
| --- | --- | --- |
| Runtime | **Node.js 22**, **TypeScript 5** | One language across the whole product. |
| Database | **MongoDB** with **Mongoose 8** | Job documents are nested and variable-shaped; a rigid schema fights the domain. |
| HTTP | **Express 4** | Health and status endpoints. |
| Scheduling | **node-cron** + a distributed lock in MongoDB | Two instances must never run the same source at once. |
| Validation | **Zod** | The environment is parsed and validated at boot, not read ad hoc. |
| Logging | **Pino** | Structured logs, cheap enough to leave on. |
| Concurrency | **p-limit** | Bounded fan-out per source. |
| Sanitisation | **sanitize-html** | Descriptions arrive as hostile HTML from third parties. |
| Testing | **Vitest** | Fast unit and integration runs. |

## Getting started

### Prerequisites

- **Node.js 22**
- **MongoDB** 6.0 or newer

### Run it locally

```bash
git clone https://github.com/<you>/resumebuilder-worker.git
cd resumebuilder-worker

npm ci
cp .env.example .env     # fill in your own values
npm run dev              # tsx watch src/index.ts
```

The service listens on `PORT` (default `4001`) and exposes `/health` with a per-source breakdown.

```bash
curl http://localhost:4001/health
```

## Configuration

All configuration is environment-based, and only the `.env.example` template is committed.

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | Connection string, database path included |
| `MONGODB_DATABASE` | Database name (default `buildairesume`) |
| `MONGODB_MAX_POOL_SIZE` / `MONGODB_MIN_POOL_SIZE` | Connection pool bounds |
| `PORT` | HTTP port (default `4001`) |
| `LOG_LEVEL` | Pino log level |
| `SERVICE_NAME` | Reported in logs and health output — **do not change** |
| `JOB_WORKER_ENABLED` | Master switch for the ingestion loop |
| `DEFAULT_CONCURRENCY` / `DEFAULT_TIMEOUT_MS` / `DEFAULT_RETRY_COUNT` | Per-source fetch policy |
| `BATCH_SIZE` | Documents per write batch |
| `DISTRIBUTED_LOCK_TTL_SECONDS` | Lock TTL, so two instances cannot run the same source at once |
| `ADZUNA_APP_ID` / `ADZUNA_APP_KEY` | Adzuna API credentials |
| `REMOTIVE_ENABLED` / `REMOTEOK_ENABLED` / `JOBSPY_ENABLED` | Per-source toggles |
| `JOBSPY_WORKER_URL` | Host URL of the JobSpy worker |
| `STALE_THRESHOLD_DAYS` / `EXPIRATION_THRESHOLD_DAYS` | When a job is considered stale / expired |

> **`SERVICE_NAME` is load-bearing.** The runtime service name is `buildairesume-job-ingestion` — the container name, this variable, and the name in the health output. Renaming it breaks monitoring.

The environment is validated by Zod at boot. A malformed value fails loudly at startup rather than at the first request that needs it.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | `tsx watch src/index.ts` |
| `npm run build` | `tsc` → `dist/` — this is also the type-check |
| `npm run start` | `node dist/index.js` |
| `npm test` | Vitest, single run |
| `npm run test:watch` | Vitest, watch mode |
| `npm run lint` | ESLint over `src/` |

## Deployment

The build context is **this directory**:

```bash
docker build -t resumebuilder-worker .
docker run --env-file .env -p 4001:4001 resumebuilder-worker
```

A `docker-compose.yml` is included for local use. The service is designed to run on its own host, independent of the web tier.

## Design notes

- **Sources are adapters.** Each one normalises to the shared job shape before deduplication, so adding a source does not touch the consumers.
- **Direct ATS sources are preferred** where practical — Greenhouse, Lever, Ashby, then company career pages — because they carry the canonical apply URL and the most reliable metadata.
- **Deduplication is by canonical job identity**, which makes re-running a source idempotent. Fingerprints combine normalised title, company and location, with similarity scoring for the cases where those differ slightly.
- **The scheduler is distributed-locked.** `DISTRIBUTED_LOCK_TTL_SECONDS` bounds how long one instance may hold a source, so a crashed run cannot block the next one forever.
- **Sanitisation happens at the boundary.** Descriptions are third-party HTML; they are cleaned before they are stored, not before they are rendered.
- **Quality gates are explicit and inspectable** — freshness scoring, hard filters and a quality gate live in `src/utils/`, so the reason a posting was dropped is a value you can read, not a heuristic buried in a query.

## License

Released under the **[MIT License](LICENSE)**. You are free to use, modify and distribute this software, including commercially, provided the copyright notice and permission notice are retained.
