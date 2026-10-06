# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- GitHub Actions CI — install, type-check, test and build for both projects
  (`.github/workflows/ci.yml`).
- Issue templates, a pull request template, `CODEOWNERS` and a Dependabot configuration.
- A README for each project: `apps/airesume_app/` and `apps/resumebuilder-worker/`.
- `.editorconfig`.
- Environment variables for the admin tooling and the local dev-bypass, documented in
  `apps/airesume_app/.env.example`.

### Changed

- **Repository restructured into a monorepo.** The Next.js application moved to `apps/airesume_app/` and the
  job-ingestion service to `apps/resumebuilder-worker/`. Each project keeps its own `package.json`,
  lockfile, `.env.example` and Dockerfile; the root `package.json` is a thin task runner and npm
  workspaces are deliberately not used.
- The root `Dockerfile` builds the app from the repository root with two targets, `runner` (web) and
  `worker` (the app's background loops), so a worker image no longer pays for the Next.js build.
- Both projects are licensed **MIT**, matching the root `LICENSE`.
- `npm test` now runs Vitest once rather than in watch mode, so it terminates and can gate CI.

### Fixed

- `npm run install:all` failed on a fresh clone. The root lockfile declared npm workspaces that the
  root `package.json` does not define, so `npm ci` refused to run.
- The app's Docker build context no longer includes the private admin project.
- Corrected a comment in `apps/airesume_app/src/lib/auth/dev-bypass.ts` that claimed nothing imported the
  module. A live route does import it, and the comment invited a maintainer to treat it as dead code.

### Security

- **Removed hardcoded credentials from published source.** A production admin password and a
  worker-gateway token appeared in `apps/airesume_app/scripts/` and `scripts/tests/`. Those values must be
  treated as **compromised and rotated** — deleting the text is not the fix. See
  [SECURITY.md](SECURITY.md).
- `docs/` is now an **allowlist**: only the four user-facing documents are published. Operational
  runbooks, audits, phase reports and the engineering registers are no longer part of this repository.
- The engineering registers (`server_bugs.md`, `refactor_audit.md`) are no longer excepted from
  `.gitignore` and so are no longer published.
- `scripts/.vps-status.json` (generated local state containing operator paths) is ignored.

### Known outstanding

- **The admin API still lives in the public app.** The admin *UI* is private, but 67 route handlers
  under `apps/airesume_app/src/app/api/admin/**` — including a `vps-setup` route that shells out — remain in
  this repository pending extraction to the private admin project.
- `apps/airesume_app` has 5 pre-existing test failures, so its CI test step reports without failing the build.
