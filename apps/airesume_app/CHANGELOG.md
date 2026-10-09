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
- Empty fields on the CV canvas now name the fact that belongs in them
  (`src/lib/utils/cv-field-labels.ts`): an unfilled slot reads "Company/Organisation", "Degree",
  "Modules summary or achievements", "Project summary or achievements", "Start"/"End" instead of a wall
  of "Type here...", and the hint is drawn faintly (gray-300 dashed slot). The rule set is section- and
  field-aware, covering both the canvas spelling (`experience.2.company`) and the Unified one
  (`work.2.name`), and never falls back to a generic label — an unlisted field is prettified from its path.
- Environment variables for the admin tooling and the local dev-bypass, documented in
  `apps/airesume_app/.env.example`.

### Changed

- **Entry descriptions are one combined view — the Design panel's "Description Layout" switch is gone.**
  A work/project/volunteer entry has a single description of ordered paragraph and bullet blocks, so
  templates no longer carry a `preferredFormatOption` and neither the canvas nor the snapshot renderer
  applies a `cv-format-bullets-only`/`cv-format-paragraph-only` class. Mixed content (bullets first,
  optionally followed by one short line) is preserved through the canvas ↔ Unified ↔ Mori round trip via
  the ordered `descriptions[]` blocks, with `summary`/`highlights` materialized from them for the ATS,
  tailoring, export and legacy readers.
- **Repository restructured into a monorepo.** The Next.js application moved to `apps/airesume_app/` and the
  job-ingestion service to `apps/resumebuilder-worker/`. Each project keeps its own `package.json`,
  lockfile, `.env.example` and Dockerfile; the root `package.json` is a thin task runner and npm
  workspaces are deliberately not used.
- The root `Dockerfile` builds the app from the repository root with two targets, `runner` (web) and
  `worker` (the app's background loops), so a worker image no longer pays for the Next.js build.
- Both projects are licensed **MIT**, matching the root `LICENSE`.
- `npm test` now runs Vitest once rather than in watch mode, so it terminates and can gate CI.

### Fixed

- **The Design panel's Item gap now moves the section title, not just the entries.** A heading's gap to
  its first entry was frozen at the template's Tailwind `mb-1.5` (6px) while the entries below scaled with
  `--cv-item-gap`, so raising the gap pulled the entries apart and left the title welded to the first one.
  Every section-title style now carries `cv-section-title`, whose bottom gap is half the item gap — 6px at
  the default 12px, so untouched documents do not move — in both the canvas and the snapshot renderer.
- Section-title icons no longer outgrow their title. They were drawn at a fixed 14-16px against a 13.2px
  heading, so the glyph read as larger than the words it labelled; they are now sized in font-relative
  units and ride the title's own type size (same rule in canvas and snapshot).
- Renaming a section ("Work Experience" → "Experience") took two clicks while another section was
  focused: the canvas's click-outside handler called `preventDefault()`, which blocked the native focus, so
  the first click only dismissed the other section's spotlight. A click that lands on an editable field is
  now allowed to put the caret in it, and the hover state of a section heading underlines it so the
  rename affordance is visible (`sectionTitles.<key>` was already persisted — only the affordance was
  missing).
- Text typed into an entry description could vanish from the CV: the active `bullets_only` /
  `paragraph_only` description layout hid the half of the stored description it did not match with
  `display: none` ("Minimalist Single" forced `bullets_only`), so a paragraph the user had just typed
  disappeared on blur and only came back when the layout was switched. Both block types now always render.
- Mori's description edits no longer land in `descriptions[]` alone — they are materialized into
  `summary`/`highlights` on merge, so an AI edit is visible in the canvas, ATS and exports immediately
  instead of being reconciled away on the next load.
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
- `npm run verify:description-blocks` (15 assertions) covers the combined-description contract and
  `npm run verify:field-labels` (14 assertions) covers the empty-field labels plus the section-title
  stylesheet wiring; neither is wired into CI yet.
- `npm run verify:field-labels` asserts the title-gap and icon rules exist in BOTH stylesheets and that the
  title-gap rule still precedes the `mb-*` block they have to beat. The remaining risk is visual: no
  browser pass has confirmed the rendered heading spacing at non-default item gaps, and the
  resume-enhancer previews (`TemplateSelector`, `Step2Template`) carry their own partial typography
  stylesheet without the `cv-section-title` rules, so their headings keep the fixed icon size.
