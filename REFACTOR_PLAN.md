# AIResume "Simple Approach" Refactor Plan

Generated: 2026-08-16 · Target: remove stale/unused code, eliminate duplication, restore a clean build, and shrink the app to its one true product flow.

## The one true core (guard this — do not delete)

- **Builder route:** `src/app/editor/page.tsx`
- **Editor orchestrator:** `src/components/resume-enhancer/ResumeEnhancerContainer.tsx` + `src/components/resume-enhancer/steps/`
- **Canvas engine (keep):** `src/components/cv-builder-pro/` (`CVBuilderProAdapter.tsx`, `CVCanvasEngine.tsx`, `registry.tsx`, `CVSnapshotDocument`)
- **Cover letter engine (keep):** `src/components/cover-letter-engine/CoverLetterLayoutEngine.tsx`
- **CV preview (keep):** `src/components/cv-preview/`
- **Redesigned dashboard (keep):** `src/components/dashboard/redesigned/` → used by `/dashboard`
- **Landing (keep):** `src/app/page.tsx` → `src/components/landing/LandingPageContent.tsx`

**Dead-pile candidates (verify each with `grep` before deleting):** old `dashboard/cards/*`, `dashboard/widgets/*`, `dashboard/charts/*`, `dashboard/feeds/*`, `cv-sections/*`, career-report widgets, interview leftovers, and the dead lib layers listed in Phase 2.

---

## Phase 0 — Restore a clean build (DO FIRST, highest impact)

1. **Fix 3 real type errors** in `src/app/api/ai/mori-chat/route.ts:594-598`. `session?.user?.id` and `cvId` are used inside the `catch` block but declared only in the `try` scope. Hoist `session`/`cvId` to function scope (or capture them in variables before the try) so the catch can reference them.
2. **Remove the escape hatch:** delete `typescript.ignoreBuildErrors: true` from `next.config.ts` so CI catches real errors again.
3. **Fix lint:** `.eslintrc.json` is ESLint 8 format but `package.json` pins `eslint ^9` and runs `next lint` (removed in Next 16). Either upgrade config to `eslint.config.mjs` (flat config) + `eslint .`, or pin `eslint@8` + `eslint-config-next@13/14`. Recommend the flat-config upgrade.
4. **Clean `next.config.ts`:**
   - Remove `firebase-admin` and `openid-client` from `serverExternalPackages` (not installed).
   - Remove `lottie-react` from `experimental.optimizePackageImports` (never imported).
   - Remove `require('dotenv').config({ path: '.env.local' })` from inside the custom `webpack()`.
   - Re-evaluate the huge hand-rolled `webpack()` (lines 16–211) — likely settable via Next properties instead.
   - Reconsider `tracesSampleRate: 1` and `sendDefaultPii: true` in `src/sentry.client.config.ts` (PII/privacy + cost).

**Verify:** `npm run type-check` → 0 errors; `npm run build` → clean.

---

## Phase 1 — Trim dependencies & root junk (safe, mechanical)

Run knip first to confirm current numbers: `npx knip` (fresh scan; results also in `knip_output_current.txt`).

**Uninstall unused deps** (confirmed 0 references in `src/`):
- `@heroicons/react`, `@radix-ui/react-collapsible`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-progress`, `@tiptap/extension-bubble-menu`, `@tiptap/extension-placeholder`, `@tiptap/extension-text-align`, `@tiptap/extension-underline`, `@types/bcryptjs`, `@types/diff`, `@types/dompurify`, `@types/lodash`, `@types/react-dnd`, `@types/react-window`, `axios`, `canvg`, `cheerio`, `cors`, `critters`, `diff`, `doc-parser`, `dompurify`, `driver.js`, `html-to-image`, `jspdf-autotable`, `lenis`, `lodash`, `lottie-react`, `micro`, `mime`, `node-fetch`, `react-dnd`, `react-dnd-html5-backend`, `react-dropzone`, `react-icons`, `react-window`, `rtf-parser`, `stripe`, `swiper`
  - ⚠️ **Re-verify `stripe`, `axios`, `node-fetch`, `lucide-react`, `react-icons`, `diff`, `lodash`** before removing — some are heavy and may be referenced via dynamic strings or in scripts outside `src/`. Cross-check with `grep`.
  - ⚠️ Remove dead `@types/*` only after confirming the corresponding runtime dep is gone.
- **devDependencies:** `@types/mime`, `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser` (if moving to flat config they may be needed — reassess after lint change), `buffer`, `crypto-browserify`, `events`, `os-browserify`, `path-browserify`, `process`, `querystring-es3`, `stream-browserify`, `url`, `util` (these are webpack polyfill shims — confirm the webpack config no longer needs `fallback` entries before removing).
- Add `unlisted` deps properly or alias them: `webpack`, `@sentry/nextjs`, `@sentry/browser`, `jose` (only if `jwt.ts` keeps a consumer — see Phase 2).

**Delete root junk:**
- Tracked blobs: `dev.log` (120KB), `eng.traineddata` (5.2MB) — `git rm`.
- One-off scripts (already reported unused by knip): `fix_registry.js`, `fix-misspellings.ts`, `inspect-*.ts` (×5), `isolated_test.ts`, `patch-registry.js`, `patch-registry-simple.js`, `replace_typography*.js` (×3), `test-*.ts`, `test-jspdf.js`, `llm.txt`, `parse.md`, `fix-all-plans.ts`, `fix-free-plan.ts`.
- Stale reports: `knip_output.txt`, `knip_output_current.txt` (delete after committing plan).
- `tsconfig.tsbuildinfo` → add `*.tsbuildinfo` to `.gitignore` and delete.
- On disk only (gitignored, not tracked — but delete locally): `key.pem`, `cookies.txt`.
- `install.sh`, `deploy.sh`, `deploy-vercel.sh`, `Dockerfile`, `railway.json`, `render.yaml` — decide the single deploy target (Vercel per `vercel.json`) and remove the rest.

**Docs:** archive or delete the 25 ad-hoc `docs/*.md` investigation notes; replace with a real `README.md` + this plan.

---

## Phase 2 — Delete provably-dead source (knip-driven, each verified)

**Rule:** every deletion is preceded by `grep` for any reference in `src/` (including dynamic imports and route handlers). Treat knip as a hint, not ground truth. Many "unused exports" are re-exports of live shadcn `ui/*` — keep those.

### 2a. Orphan component dirs
- `src/components/cv-sections/*` (11 section components) — only imported by `src/lib/templates/template-renderer.tsx`. First determine if `template-renderer.tsx` is live; if yes, migrate it to `cv-builder-pro`'s block registry, then delete both if unreachable.
- Legacy dashboard: `src/components/dashboard/cards/*` (`CVEditorCard`, `ApplicationTrackerCard`, `JobTrackerCard`, `InterviewCoachCard`), `CareerReportSidebar`, `Canvas.tsx`, `events/*` tree, `widgets/*`, `charts/*`, `feeds/*`.
- Career report: `src/components/career-report/` + `widgets/*` (12 files).
- Interview: `src/components/interview/*`, orphaned `interview/` pieces not used by `interview-coach/`.
- LinkedIn enhancer: `FieldMappingTable.tsx`, `LinkedInPostPreview.tsx`, `LinkedInProfileSync.tsx`.
- Parse: `src/components/parse/JobDescriptionParserModal.tsx`.
- Pricing: `RedesignedPricingCards.tsx`. Feedback: `FeedbackModal.tsx`, `FeedbackPrompt.tsx`. Settings: `SettingsPage.tsx`, `UsernameEditor.tsx`. CV preview: `LivePreview.tsx`, `BuilderPreview.tsx`.
- Landing: `ProductVideo.tsx`, `AnalyticsImageSection.tsx`, `AnalyticsOverlay.tsx`, `LaunchBanner.tsx`.

### 2b. Dead lib layers (each is a subsystem, confirm no references)
- `src/lib/pill-engine/**` (analyzers, domain-data)
- `src/lib/rendering/**`, `src/lib/reconciliation/**`, `src/lib/snippets/**`, `src/lib/sync-engine/**`
- `src/lib/design-system/**` (superseded by shadcn `ui/`)
- Dead `src/lib/repositories/*` (`cover-letter-repository`, `job-repository`, `index`)
- Dead `src/lib/services/*` + `src/lib/hooks/*` + `src/lib/utils/*` reported unused by knip (list via `npx knip --include files`).
- `src/lib/jwt.ts` custom token system → after removing its **single** consumer (`src/app/api/auth/refresh/route.ts`), delete. Also `src/lib/session.ts` (self-deprecated), and remove Firebase fallback branches in the 3 routes that read `x-firebase-user-id`.

### 2c. Non-`src` dead code
- `plans/*` (root `*.jsx`), `fix-*.ts`, `test-*.ts`, `patch-*.js` — covered in Phase 1.

---

## Phase 3 — Consolidate duplication (bigger, needs care)

- **Auth → one system, one API.** Collapse `AuthContext/useAuth`, `useUnifiedAuth`, `SessionProvider` into a single client hook (`useAuth`). Standardize imports on one of `@/lib/auth` / `@/lib/auth-config` (keep `unified-auth-service.ts` as truth). Remove duplicate auth `create-session`/`custom-session`/`refresh` routes that overlap NextAuth native endpoints.
- **DB → one connection layer.** Standardize on Mongoose `src/lib/database/connection-manager.ts`; port the ~6 raw-`MongoClient` services (`auditService`, `jobPreferencesService`, `automationService`, `applicationService`, `jobMatchingService`, and `api/applications/auto`, `api/jobs/metrics`, `api/jobs/list`) onto it, then remove `lib/db.ts`/`lib/mongodb.ts`.
- **API surface dedupe** (verify consumers before merging any):
  - CV: choose one of `/api/cv*` / `/api/cvs*` / `/api/cv-draft*`; merge `cv-draft/save`, `cvs/[id]/save`, `cv/create-master`.
  - Cover letters: 4 endpoints → one (`/api/ai/generate-cover-letter` or the v3 path used by the live engine).
  - Discount: `/api/discount/validate`, `/api/coupons/validate`, `/api/coupons/apply` → one.
  - Pricing: `/api/pricing-plans`, `/api/pricing/regional`, `/api/admin/pricing-plans` → consolidate.
  - Parse: `cv/parse`, `cv-parser`, `ai/parse-cv`, `v1/b2b/parse`, `parse-job` → one public + one b2b.
  - Identity: `user/current`, `users/profile`, `users/resolve`, `user/settings/profile`, `user/create-profile` → one canonical.

---

## Phase 4 — De-monolith & simplify

- Split `src/app/welcome/page.tsx` (2,867 lines) into step components.
- Split `src/components/resume-enhancer/ResumeEnhancerContainer.tsx` (3,763 lines) — extract the modes/panels it conditionally renders (`SurgeonReportModal`, `MoriChatInterface`, `RecruiterModePanel`, `FloatingPulsePill`, etc.).
- Delete `/dashboard/canvas` (dead redirect) and remove the duplicate `/dashboard/redesigned` route (keep the real `/dashboard`).
- Remove unused `src/app/actions/profile-actions.ts` stub (server actions are otherwise unused) or wire it properly.

---

## Verification gating (after each phase)

- `npm run type-check` → 0 errors
- `npm run build` → pass
- `npm run lint` → pass (after Phase 0 fix)
- `npm test` (vitest) → pass
- Manual smoke: `/`, `/editor` (all 5 steps), `/dashboard`, a login + CV save + template render.

## Rollback

- Work on a feature branch (`git checkout -b refactor/simple`).
- Commit after each phase with a clear message so any phase can be reverted independently.
- Sweep with `npx knip` after each phase and re-diff; confirm shadcn `ui/*` re-exports are retained.

## Known knip false positives (do NOT delete blindly)

- `src/components/ui/*` shadcn re-exports (`badgeVariants`, `buttonVariants`, `DialogPortal`, etc.) — used internally.
- `cv-sections/*` — imported by `template-renderer.tsx` (resolve renderer fate first).
- Anything referenced via dynamic `/api/*` fetch strings in client code — re-check with grep.
