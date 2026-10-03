# AIResume

An AI-powered career platform. Create an ATS-friendly resume, match it to real jobs, tailor it per
application, apply, and track the outcome.

    BUILD  →  MATCH  →  TAILOR  →  APPLY  →  TRACK  →  LEARN

Licensed under the [MIT License](LICENSE).

## Projects

| Project | Path | Description |
| --- | --- | --- |
| **app** | repo root (`src/`, `next.config.ts`) | The Next.js web application — resume builder, job discovery, matching, tailoring, tracking. |
| **resumebuilder-worker** | `buildairesume-job-ingestion/` | The job-ingestion service. Owns the source adapters, normalisation, deduplication and its scheduler. Deployed on its own VPS. |

> The **admin panel** is maintained in a separate **private** repository. Its source is intentionally
> not part of this public repository.

## Getting started

Requires **Node.js 22** and **MongoDB**.

```bash
# app  (repository root)
cp env.example .env.local     # fill in your own values
npm install
npm run dev                   # http://localhost:3000

# resumebuilder-worker
cd buildairesume-job-ingestion
cp .env.example .env
npm install
npm run dev
```

## Environment files

**Configuration lives exclusively in environment files, and only templates are committed.**

- Each project ships its own `.env.example` — key names with placeholder values, never real ones.
- Real values go in `.env.local` / `.env`, which `.gitignore` excludes at every depth.
- Nothing sensitive is hardcoded in the source. `node .verify/scan-secrets.mjs` scans the tracked
  tree for credential shapes; it should report zero hits.

See [SECURITY.md](SECURITY.md) for the full policy and the incident-response procedure.

## Deployment

The app and the worker build from their own Dockerfiles. Deployment configuration lives in `deploy/`
and is documented under `docs/deployment/`.

## Roadmap

The repository is being restructured into an `apps/*` workspace monorepo (`apps/app`,
`apps/resumebuilder-worker`) so each project installs and deploys independently. Until that lands, the
app lives at the repository root and the worker in `buildairesume-job-ingestion/`. See
`docs/deployment/public-release.md`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). The short version: never commit a secret, and keep
configuration in environment files.
