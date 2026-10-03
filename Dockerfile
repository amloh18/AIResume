# BuildAIResume — production image (two build targets)
#
#   docker build --target runner .        the Next.js web tier              (serves HTTP, runs no loops)
#   docker build --target worker .        the background-worker tier        (no HTTP, runs the loops)
#
# They share the dependency and build stages, so the expensive part is built once. `runner` is the
# Dockerfile default, so an existing build configuration that does not pass `--target` is unaffected.
#
# Build context is the REPOSITORY ROOT (`.`), not `apps/app`. The app's sources are read from
# `apps/app/` and are installed there; the *runtime* stages then flatten the app back to `/app` so the
# container layout is byte-for-byte what it was before the monorepo move. That matters because several
# route handlers resolve paths against `process.cwd()`:
#
#   src/app/images/[filename]/route.ts   → <cwd>/public/images/...
#   src/app/api/cv/parse/route.ts        → <cwd>/package.json, <cwd>/node_modules/pdfjs-dist/...
#
# so `<cwd>` must keep containing `public/`, `package.json` and `node_modules/`.
#
# NOT to be confused with `apps/resumebuilder-worker/` — that is the standalone job-ingestion
# microservice (its own Dockerfile, its own build context, port 4001). The `worker` target *here* is
# the Next.js app's own background tier: email delivery, inbound mail, the application queue and the
# reconciliation watchdog.
#
# The web tier runs the Next.js application and nothing else. Everything that needs a browser or Python
# lives on the VPS host as a systemd service, reached over HTTP / CDP:
#
#   ATS form automation  → Playwright.connectOverCDP → PLAYWRIGHT_REMOTE_URL      (browser service)
#   PDF rendering        → Puppeteer.connect         → PUPPETEER_BROWSER_WS_ENDPOINT
#   Job discovery        → HTTP                      → INGESTION_WORKER_URL       (worker gateway)
#
# See `docs/deployment/vps-automation-workers.md` for the host services, the env contract and rollback.
#
# Layer-cache strategy
# --------------------
# Everything expensive is keyed on inputs that application source cannot change. The base image is
# pinned by DIGEST, not tag: `node:22-bookworm-slim` is mutable, and when Docker Hub republishes it the
# digest changes, invalidating every layer after `FROM base` — which is what produced the "deps cached,
# apt re-running" pattern in the old deploy logs. Bump deliberately; expect one slow build when you do.
#
# What this replaced (Stage 2 of the automation migration):
#   - a `browsers` stage running `playwright install --with-deps chromium`
#   - an apt layer with python3/pip/git/wget plus 15 X/GTK libraries
#   - `pip3 install playwright` and JobSpy from a git URL, per deploy
#   - `COPY scripts/` so those workers could be spawned in-container
#
# Result: no browser, no Python, no apt at all in the runtime image. Rollback is a code revert — the
# old stages are in git history — but note that auto-apply and PDF rendering then require the remote
# browser to be configured, since the image no longer *has* a Chromium to fall back to.

FROM node:22-bookworm-slim@sha256:48e4b67d85f87bd551df43704e24d252f56cc5f8e9718841aace50f19948f0f9 AS base

# ── deps ───────────────────────────────────────────────────────────────────────
# Installs into the app's own directory (`/app/apps/app/node_modules`) rather than hoisting to `/app`.
# Keeping the install where the app expects it means the app tree stays self-contained — nothing here
# depends on a workspace-aware root lockfile.
FROM base AS deps
WORKDIR /app/apps/app
COPY apps/app/package.json apps/app/package-lock.json apps/app/.npmrc* ./
# Neither browser engine is downloaded: the runtime reaches a browser on another host, and shipping a
# ~300 MB cache into the image would defeat the point of this file.
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=true
RUN npm ci --legacy-peer-deps

# Fail here — loudly and immediately — if a package the image cannot run without is missing.
# `npm ci` treats a failed fetch of an *optional* dependency as non-fatal: it warns, skips it, and
# still exits 0. That is how a missing `tesseract.js` slipped through and resurfaced ~3.5 minutes
# later inside the bundler as `Module not found: Can't resolve 'tesseract.js'` — an error naming
# neither the install nor the network. `tesseract.js` is now a real dependency, so this check is
# belt-and-braces against any future silent skip.
RUN node -e "const req=['next','react','mongoose','mammoth','tesseract.js'];const missing=req.filter(p=>{try{require.resolve(p);return false}catch{return true}});if(missing.length){console.error('FATAL: required dependencies missing after npm ci: '+missing.join(', '));process.exit(1)}console.log('OK required dependencies present: '+req.join(', '))"

# ── source ─────────────────────────────────────────────────────────────────────
# node_modules plus the working tree, with nothing built from them. `builder` and `worker-bundle`
# are now siblings that both start here.
#
# `worker-bundle` used to be `FROM builder`, and the `worker` target copies only `node_modules`,
# `package.json` and `dist/` — never `.next`. So every worker image paid for the full Next.js build
# and then discarded it. That was merely wasteful while one Dockerfile produced one image, but
# Dokploy runs with `cleanCache = t`, so every build is cold and two images share nothing: a second
# Dokploy application for the worker would have run the 4 GB-heap Next.js build twice per deploy, on
# a 4-core / 7 GB box. Splitting the stage is what makes that second application cheap.
FROM base AS source
WORKDIR /app
COPY --from=deps /app/apps/app/node_modules ./apps/app/node_modules
COPY . .

# ── builder ────────────────────────────────────────────────────────────────────
FROM source AS builder
WORKDIR /app/apps/app
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=true
# Version truth: `/api/health` reports this, so an operator can confirm which commit is actually
# running instead of inferring it from an image build timestamp. Passed by the build, not baked from
# `.git` (the context is `.dockerignore`-filtered and may not contain history at all).
ARG GIT_COMMIT=unknown
ENV GIT_COMMIT=${GIT_COMMIT}
RUN npm run build

# Build identity that needs nothing passed in.
#
# `GIT_COMMIT` above only reports anything if something *supplies* it, and nothing does: Dokploy has no
# build-arg for it and `.dockerignore` excludes `.git`, so `/api/health` has reported `"commit":"unknown"`
# on every deploy. An identity field that is always "unknown" is worse than none — it reads as a feature.
# A timestamp written at build time is always populated, and it is what actually answers "is this
# container older than that one?".
#
# Placed after `npm run build` so it does not invalidate the expensive `deps`/`npm ci` layers.
RUN date -u +%Y-%m-%dT%H:%M:%SZ > /app/.build-time

# ── worker bundle ──────────────────────────────────────────────────────────────
# esbuild bundles src/workers/entry.ts into dist/worker.mjs. The build script verifies that every
# external specifier in the output resolves under plain Node, so an unresolvable import fails the
# image build instead of the deploy.
FROM source AS worker-bundle
WORKDIR /app/apps/app
# Re-declared because this stage no longer inherits `builder`'s ENV block, and the bundle must be
# built for production. `npm run build:worker` is esbuild over `src/workers/entry.ts` and needs
# neither `.next` nor the Next.js runtime. `scripts/build-worker.mjs` derives its project root from
# its own location (`apps/app/scripts/`), so it needs no path overrides here.
ENV NODE_ENV=production
RUN npm run build:worker

# ── worker ─────────────────────────────────────────────────────────────────────
# The background loops: email delivery, inbound mail ingestion, the application queue and the
# reconciliation watchdog. Separate container so redeploying the web tier cannot interrupt them.
#
# No `public/` and no `.next/`: nothing in the worker reads them (templates and copy live in the bundle).
FROM base AS worker
WORKDIR /app

ENV NODE_ENV=production
ENV WORKER_ROLE=worker
ENV WORKER_HEALTH_PORT=8791

# Same version truth as `builder`, for the same reason: `/health` on :8791 reports it, so an operator
# can tell a *stale* worker (old commit, still answering) from a current one. Without it the only
# signal that the worker was not redeployed is a missing feature or a behaviour change.
ARG GIT_COMMIT=unknown
ENV GIT_COMMIT=${GIT_COMMIT}

RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 nextjs

# Everything comes from `source`, not `builder` — so Docker never schedules the Next.js build for
# this target. That is the whole point of the split above.
COPY --from=source --chown=nextjs:nodejs /app/apps/app/node_modules ./node_modules
COPY --from=source --chown=nextjs:nodejs /app/apps/app/package.json ./package.json
COPY --from=worker-bundle --chown=nextjs:nodejs /app/apps/app/dist ./dist

# Same build identity as `runner`, for the same reason — see the note there. Written while still root,
# then handed to `nextjs` so the unprivileged process can read it.
RUN date -u +%Y-%m-%dT%H:%M:%SZ > /app/.build-time && chown nextjs:nodejs /app/.build-time

USER nextjs
# Internal health port only. Do not publish it; the web service reaches it on the Docker network.
EXPOSE 8791

# Node's global fetch is available in 22.x, so this needs no curl in the image.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+(process.env.WORKER_HEALTH_PORT||8791)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# SIGTERM reaches the entrypoint, which stops each loop, waits out WORKER_SHUTDOWN_GRACE_MS and closes
# MongoDB. Give Docker more than that before SIGKILL: `--stop-timeout 30` (Dokploy: Stop grace period).
CMD ["node", "dist/worker.mjs"]

# ── runner ─────────────────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Carried from the builder stage so `/api/health` can report the running commit.
ARG GIT_COMMIT=unknown
ENV GIT_COMMIT=${GIT_COMMIT}

# Create user and group FIRST (needed for chown later)
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 nextjs

# Application files, flattened back to /app. No apt, no Python, no browser binaries, no `scripts/`.
# The flattening is deliberate: `<cwd>` (= /app) must contain `public/`, `package.json` and
# `node_modules/` for the `process.cwd()`-relative route handlers listed at the top of this file.
COPY --from=builder --chown=nextjs:nodejs /app/apps/app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/apps/app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/apps/app/package.json ./package.json
# The build stamp, so `/api/health` can report when this image was built.
COPY --from=builder --chown=nextjs:nodejs /app/.build-time ./.build-time

# Next.js writes ISR / image-optimizer output here.
RUN mkdir -p /app/.next/cache && chown -R nextjs:nodejs /app/.next

USER nextjs
EXPOSE 3000

CMD ["npm", "run", "start"]
