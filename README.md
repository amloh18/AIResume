# AIResume

An AI-powered career platform. Create an ATS-friendly resume, match it to real jobs, tailor it per
application, apply, and track the outcome.

    BUILD  →  MATCH  →  TAILOR  →  APPLY  →  TRACK  →  LEARN

Licensed under the [MIT License](LICENSE).

## Projects

| Project | Path | Description |
| --- | --- | --- |
| **app** | `apps/app/` | The Next.js web application — resume builder, job discovery, matching, tailoring, tracking. |
| **resumebuilder-worker** | `apps/resumebuilder-worker/` | The job-ingestion service. Owns the source adapters, normalisation, deduplication and its scheduler. Deployed on its own VPS. |

Each project is self-contained: its own `package.json`, its own lockfile, its own `.env.example` and
its own `Dockerfile`. There is no workspace root lockfile, so installing or deploying one project
never drags in the other's dependencies.

> The **admin panel** is maintained in a separate **private** repository. Its source is intentionally
> not part of this public repository.

## Getting started

Requires **Node.js 22** and **MongoDB**.

```bash
# app
cd apps/app
cp .env.example .env.local     # fill in your own values
npm ci
npm run dev                    # http://localhost:3000

# resumebuilder-worker
cd apps/resumebuilder-worker
cp .env.example .env
npm ci
npm run dev
```

The repository root carries a thin task runner that delegates to both projects:

```bash
npm run dev          # → apps/app dev server
npm run build        # → apps/app production build
npm run build:worker # → bundle the app's background worker
npm run test         # → apps/app test suite
npm install:all      # → npm ci in both projects
```


## Environment files

**Configuration lives exclusively in environment files, and only templates are committed.**

- Each project ships its own `.env.example` — key names with placeholder values, never real ones.
- Real values go in `.env.local` / `.env`, which `.gitignore` excludes at every depth.
- Nothing sensitive is hardcoded in the source. `node .verify/scan-secrets.mjs` scans the tracked
  tree for credential shapes; it should report zero hits.

See [SECURITY.md](SECURITY.md) for the full policy and the incident-response procedure.

## Deployment

Two independent Docker builds:

- **app** — `Dockerfile` at the repository root, build context `.` (the repository root). It produces
  two targets: `runner` (the Next.js web tier, the default) and `worker` (the app's own background
  loops). Build it with `--target worker` for the background tier. Because the context is the
  repository root, the sources are read from `apps/app/` and then flattened back to `/app` in the
  runtime stages — see the header comment in the Dockerfile for why.
- **resumebuilder-worker** — `apps/resumebuilder-worker/Dockerfile`, build context
  `apps/resumebuilder-worker`. Fully self-contained.

Deployment configuration lives in `deploy/` and is documented under `docs/deployment/`.

## Roadmap

Each project installs and deploys independently from its own directory. The next step is extracting
the admin panel into its own deployable app; the measured plan is in
`docs/deployment/admin-split-plan.md`. See `docs/deployment/public-release.md` for the release
checklist.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). The short version: never commit a secret, and keep
configuration in environment files.
