# Moving the worker (and the ingestion microservice) under Dokploy

**Status: PLAN ONLY — nothing here has been implemented.**
Written 2026-09-27, from a read-only inspection of the live box.

The goal: **stop needing a manual `docker service update --force` after every deploy.** Today the worker
runs whatever image was current the day it was created, so a deploy silently ships half a release.

---

## 1. What is actually running today (measured, not inferred)

| Thing | How it is deployed | Dokploy-managed? |
| --- | --- | --- |
| `buildairesume-app-vmvp35` (web) | Dokploy **application** `resumebuiler` | yes |
| `buildairesume-worker-daemon` (loops) | **hand-made Swarm service** | **no** |
| `buildairesume-job-ingestion` (discovery) | **docker-compose** project at `/opt/cvcircle-build/buildairesume-job-ingestion/` | **no** |

Evidence:

- `docker service inspect buildairesume-worker-daemon` → `Labels: {}`, image
  `buildairesume-app-vmvp35:latest` (the **web** image), `PORT=3009`, **no `WORKER_ROLE`** (so it defaults
  to `all`, which is why it drains the queue).
- **Confirmed again 2026-09-27, this time on the running container** (not the spec):

  | Probe | Result | Meaning |
  | --- | --- | --- |
  | `docker inspect <worker-ctr> --format '{{.Image}}'` | `sha256:029e44d7f146…` | **the pre-fix image** |
  | `{{.State.StartedAt}}` | `2026-09-27T15:32:52Z` | started 21:02 IST |
  | app image built | `36ace7eb4437` at **22:47:14 IST** | the app moved; the worker did not |
  | `ls /app/dist/worker.mjs` | **No such file** | it is the web image, not the worker target |
  | `{{.Config.Cmd}}` | `npm run start` | it runs Next.js + the in-process loops |

  So `SB-01b` is not a theoretical staleness: **the app tier is running code from `47d46c30` and the worker is
  not.** The two halves of the same release disagree about what the code is.
- The app container has `WORKER_ROLE=web`; the worker container has no such variable. Both are on
  `dokploy-network` (the network literally named `3qw5bnsbfhm9jkaq3u253wesb`), together with `mongodb`,
  `stalwart-mail`, `dokploy-traefik` and `buildairesume-job-ingestion`.
- Dokploy's `application` table has a **`dockerBuildStage` column, currently empty** for `resumebuiler`.
  That empty column *is* the bug: Dokploy's build never passes `--target`, so it produces the Dockerfile
  default (`runner`) and the tag holds the web image.
- `buildairesume-job-ingestion` carries `com.docker.compose.project=buildairesume-job-ingestion` labels —
  it is a compose project, not a Swarm service.

**Why the worker cannot simply be "fixed" where it stands:** a Swarm service that Dokploy does not know
about is never touched by a deploy. Re-tagging it is a one-off; the next deploy re-creates the app and
leaves the worker behind again. That is the loop we are trying to break.

---

## 2. The prerequisite that changes the whole cost calculation

The Dockerfile is:

```
base → deps → builder (npm run build ← the full Next.js build) → worker-bundle → worker
                                                                 → runner
```

`worker-bundle` is declared **`FROM builder`** (line 75), so building the **worker** target runs the
**entire Next.js build** — even though:

- the `worker` target copies only `node_modules`, `package.json` and `dist/`, and **never copies `.next`**;
- `scripts/build-worker.mjs` bundles `src/workers/entry.ts` with esbuild and explicitly *warns* if the
  output references the Next.js runtime;
- the docs already describe building it standalone: `npm run build:worker` → `dist/worker.mjs`.

The comment at the top of the Dockerfile says the stages are shared "so the expensive part is built once."
**That assumption does not hold here, because Dokploy has `cleanCache = t`** — every build is cold, and two
separate `docker build` invocations share nothing.

**Consequence:** naively adding a second Dokploy application would run the 4 GB-heap Next.js build **twice
per deploy**, on a **4-core / 7 GB box with ~3 GB free and a disk at 84%**. That is a real OOM risk, not a
theoretical one.

**Fix (small, and it makes the rest cheap):** split `builder` so the worker does not depend on it.

```dockerfile
# ── source ─────────────────────────────────────────────────────────────────────
# node_modules + the working tree, and nothing built from them. Both `builder` and
# `worker-bundle` start here; neither inherits the other's output.
FROM base AS source
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

FROM source AS builder
# …unchanged: ENV block, ARG GIT_COMMIT, RUN npm run build

FROM source AS worker-bundle
RUN npm run build:worker
```

The `worker` target then never runs `npm run build`. Expected effect: worker image build drops from
~18 min to roughly 2–4 min (it is an esbuild bundle plus an `npm ci`).

**This is worth doing even if we never add a second Dokploy app**, because it removes a full Next.js build
from every worker rebuild.

> ⚠️ **Verify before relying on it.** Confirm `npm run build:worker` succeeds with no `.next` present.
> It should — but the change must be proven with a real build, not by reading. Fallback if it fails:
> leave `FROM builder` and accept the doubled build (see Option B).

---

## 3. The plan

### Option A — second Dokploy **application** with `dockerBuildStage: worker` *(recommended)*

This is what `docs/deployment/worker-service.md` already prescribes; it has simply never been executed.
Dokploy has a first-class column for exactly this.

1. **Dockerfile fix** (§2) and a deploy to confirm the worker target still builds and boots.
2. **Create the app in the Dokploy UI** — *not* by writing SQL (see §4, risk 1):
   - Source: same repo (`CVCircle_app` / `amloh18` / branch `refactor/simple`), Dockerfile `Dockerfile`.
   - **Build stage / target: `worker`** → this is what populates `dockerBuildStage`.
   - **Ports: publish none.** The worker serves only `:8791/health` on the Docker network.
   - **Environment:** the same values the current worker Swarm service has (that spec is the authoritative
     list — 30 variables, including `MONGODB_URI`, `MONGODB_DB`, the Stalwart/JMAP set, `JWT_SECRET`,
     `NEXTAUTH_SECRET`, `GEMINI_API_KEY`, `CRON_SECRET`, `INGESTION_WORKER_URL`, `INGESTION_SERVICE_URL`,
     `PLAYWRIGHT_REMOTE_URL`, `PUPPETEER_BROWSER_WS_ENDPOINT`, `OLLAMA_*`, `LINKEDIN_*`).
     **Do not set `WORKER_ROLE`** — the worker image already sets `WORKER_ROLE=worker` itself, and setting
     `web` here would stop every loop.
   - **Mount:** bind `/var/lib/buildairesume` → `/var/lib/buildairesume` (needed by
     `LINKEDIN_BROWSER_PROFILE_DIR` and `LINKEDIN_DEBUG_DIR`). Dokploy supports this; the app already has
     this exact mount.
   - **Stop grace period: 30** (must exceed `WORKER_SHUTDOWN_GRACE_MS`, default 5 s, or Docker SIGKILLs a
     container mid-submission).
   - **Restart policy: any/always** — the process exits non-zero when it cannot start a loop, and that is
     the intended restart signal.
   - Resources: 1 CPU / 1 GB matches today's service.
   - `autoDeploy`: on, so it follows the same branch.
3. **Stop the old Swarm service** (`docker service rm buildairesume-worker-daemon`) once the new one is
   healthy. Do not run both for long — it is *safe* (claims are atomic, emails are idempotency-keyed) but
   wasteful.
4. **Verify** (§6), then remove the manual nudge from the runbook.

**Cost of A:** one extra cold build per deploy. With §2 done, that build is minutes, not 18 — and it does
not need the 4 GB Next.js heap.

### Option B — one Dokploy **compose** project, two services *(alternative)*

A single compose file with two services over the same build context, one targeting `runner` and one
`worker`. Docker builds the shared stages **once** within one invocation, so this is the most
resource-efficient shape and it matches the Dockerfile's own stated design.

Trade-offs: it is a different Dokploy code path from the application one (you already run a compose project,
" Achare CRM", so it is not unfamiliar); it does not use `dockerBuildStage`; and Traefik routing for the web
tier has to be reproduced in the compose file. Choose this only if the doubled build in Option A still
hurts after §2.

**Recommendation: Option A.** It is the documented path, it is reversible by deleting one app, and §2
removes its only real cost.

---

## 4. Risk assessment

| # | Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- | --- |
| 1 | **Env vars must be re-entered by hand.** Dokploy stores `env` **encrypted at rest** (`enc:v1:…`), so the row cannot be cloned by copying it — a hand-written SQL row would carry an unreadable env. A missing variable means a loop silently does not start. | High (it's manual) | High | Create through the Dokploy UI so it encrypts properly. Then **diff the running container's env against the old service's** before removing the old one. The worker logs every loop it starts, and exits non-zero if none start — so a missing var is loud, not silent. |
| 2 | **Host-service reachability.** The worker talks to Stalwart/JMAP, Playwright (`172.17.0.1:9222`), the ingestion gateway (`172.19.0.1:8790`), Ollama (`172.19.0.1:11434`) via host bridge addresses. | **Resolved — measured** | — | **No longer a prediction.** Both the app and the worker are already on `dokploy-network`, and probing from inside the worker container showed the host services are reachable at `172.19.0.1` and `172.17.0.1` **from that network**. A new Dokploy worker lands on the same network and reaches the same addresses. **But the network gateway `10.0.1.1` does *not* work** — do not substitute it. Full evidence in §11.3. |
| 3 | **Double-draining during cutover** | High (by construction) | Low | Designed for: `claimNextApplication` is an atomic `findOneAndUpdate`; emails carry idempotency keys. Remove the old service promptly anyway. |
| 4 | **Build resource exhaustion** — two cold builds, one of which wants a 4 GB heap, on 4 cores / 7 GB with ~3 GB free and disk at 84% | Medium | High (OOM can take down the running app) | §2 removes the Next.js build from the worker entirely. Build the worker app **once manually** and watch `free`/`df` before enabling `autoDeploy` on it. |
| 5 | **Disk growth.** 17 GB free, 84% used, images never pruned, `cleanCache=t`. Two images per deploy. | Medium | Medium | `docker image prune` on a schedule, or keep `rollbackActive` off and prune old tags. Worth monitoring regardless of this plan. |
| 6 | **`WORKER_ROLE` on the wrong service.** Setting `WORKER_ROLE=worker` on the *web* image stops every loop in the process that is running them — this is the one mistake that turns a fix into an outage. | Low | Critical | The new app runs a genuine `worker` target, which sets `WORKER_ROLE=worker` itself. Never add it to the web app. Verify with `/api/health` on both tiers afterwards. **De-risked 2026-09-27:** the `runner` stage does **not** bake `WORKER_ROLE` (only the `worker` stage does, `Dockerfile:87`), and the app service sets `WORKER_ROLE=web` in its own spec. The worker service sets neither, so a container from either image defaults to `all`. **That is why the stopgap nudge is safe** — re-pointing the worker at `:latest` cannot accidentally give it `web`. |
| 9 | **A data normalisation is queued behind this migration.** The SB-06 *read* fix is deployed to the app tier but not the worker, and the proposed bulk rewrite of the mixed-id stores would break the stale worker. | High if done now | High | **Do not normalise the data until the worker is current** — see §10. Better: don't normalise at all (§10 says why the bulk rewrite is the wrong fix regardless). |
| 7 | **Silent staleness returns** if someone edits the old Swarm service instead of the Dokploy app | Medium | Medium | Delete the old service; document that the worker is now a Dokploy app. |
| 8 | **The migration is not needed for the queue to work today** — the loop already drains it | — | — | This is a *deployability* fix, not a correctness fix. Nothing user-visible breaks while it is pending; the cost of waiting is only the manual nudge. |

**Overall: moderate, and mostly front-loaded into one manual step (the env list).** Nothing here touches
data. Rollback is a single command.

---

## 5. Rollback

Immediately, and without a build:

```bash
docker service update --force --image buildairesume-app-vmvp35:latest buildairesume-worker-daemon
```

…if the old service still exists. If it has been removed, re-create it from the saved spec (take
`docker service inspect buildairesume-worker-daemon` **before** deleting it and keep that JSON — it is the
complete, working definition).

Recreate the old state in Dokploy by deleting the new worker application. The web tier is untouched
throughout, so the site never goes down.

---

## 6. Verification (must all hold)

```bash
# 1. The new worker is genuinely the worker image
docker service inspect <new-worker-service> --format '{{.Spec.TaskTemplate.ContainerSpec.Image}}'
docker exec <new-worker-container> ls /app/dist          # → worker.mjs present
docker exec <new-worker-container> ls /app/.next         # → No such file or directory

# 2. It started every loop
docker service logs <new-worker-service> | head -20
#   [Worker] starting pid=1 role=worker node=v22.x loops=[email, emailIngestion, applicationQueue, reconciliation]

# 3. Health, from the Docker network
curl -s http://<new-worker-service>:8791/health

# 4. The tier split is still correct
curl -s https://resume.morigrid.com/api/health   # → role: web, loops: []
# and the worker's own /health → role: worker, loops: [all four]

# 5. The critical one — the whole point of the exercise:
#    trigger a deploy, then confirm the worker's task was recreated on the NEW image
docker service ps <new-worker-service> --no-trunc --format '{{.Name}} {{.CurrentState}}'
docker images --format '{{.CreatedAt}} {{.ID}}' | head -1
# task created AFTER the image timestamp ⇒ it followed the deploy

# 6. Version truth — the worker now reports the commit it was built from
curl -s http://<new-worker-service>:8791/health | jq '{role, commit, loops}'
curl -s https://resume.morigrid.com/api/health | jq '{role, commit}'
# the two commits must MATCH; a mismatch is exactly the stale-worker bug, now visible
curl -s https://resume.morigrid.com/api/admin/vps-setup | jq '.workerLoop | {commit, commitStale}'
#   commitStale: true  ⇒ the worker is answering from an older image
#   commitStale: null  ⇒ not comparable (GIT_COMMIT was not passed to one of the builds)
```

A redeploy must also leave `uptimeSeconds` in the worker's `/health` **rising** across a web-only deploy —
that is the signal that a site deploy no longer restarts the loops.

---

## 7. Phase 2 — the ingestion microservice (separate change)

`buildairesume-job-ingestion` is a docker-compose project at
`/opt/cvcircle-build/buildairesume-job-ingestion/`, outside Dokploy. It is **lower priority** than the
worker: job discovery is not user-blocking the way application submission is, and moving it means
reproducing its compose file inside Dokploy (ports, volumes, env).

Recommended sequencing: **do the worker first, prove the pattern, then move ingestion with the same
recipe.** Do not do both in one change — if the deploy breaks, you want one suspect.

Note that the app reaches it over HTTP (`INGESTION_WORKER_URL=http://172.19.0.1:8790`), i.e. via a host
port, so its internal networking is less entangled than the worker's.

---

## 8. What I need from you before implementing — `ANSWERED 2026-09-27`

1. **Go-ahead for the Dockerfile change in §2** — ✅ **done, committed `993006dd`.** Verified with the real
   build (`.next` moved aside, `dist/worker.mjs` still emitted).
2. **Option A or B** — ✅ **Option A.** A second Dokploy application with `dockerBuildStage: worker`.
3. **A maintenance window** — ✅ **~40 minutes, at your convenience.** Re-examined while answering: there is
   no irreversible moment after all. The cutover *scales* the old worker to `0/0` instead of removing it, so
   the rollback is `docker service scale …=1`. Deleting it is deferred housekeeping, not part of the change.
   With no live users, the only cost of a bad window is your own time.
4. **The exposed secrets (§9)** — ✅ **migrate first, rotate after.** The env is entered once now and rotated
   as a separate change; the cost is touching it twice, which was accepted.

**Execution is a runbook, not this document:** `dokploy-worker-runbook.md` — the step-by-step, written to be
run by hand, with the exact Dokploy settings, the env payload, the verification commands and a rollback.

**Why I could not create the application myself.** Dokploy's API is live on `:3000` but returns `401`, and
the `apikey` table is **empty** — and it stores only a hash (`key`), so a key cannot be recovered from the
database either. Creating the application by raw SQL is not an option: Dokploy keeps env in a separate
`environment` row, **encrypted at rest**, so an insert would produce a broken application. The choice was
therefore an API key (I drive it end to end) or the UI (you drive it, I verify). You chose the runbook.

Also confirmed while checking: `dockerBuildStage` exists as a column and is **empty on all three existing
applications**, and `resumebuiler` has `cleanCache = t` — both of which this plan had asserted and neither of
which had been measured until now.

---

## 9. ⚠️ Separate, urgent: secrets were exposed in a shell transcript

While inspecting the worker's configuration I ran `docker service inspect buildairesume-worker-daemon`,
which prints the service's **environment variables in clear text**. That output landed in the session
transcript and includes:

`MONGODB_URI` (with the Mongo password) · `JWT_SECRET` · `NEXTAUTH_SECRET` · `GEMINI_API_KEY` ·
`CRON_SECRET` · `STALWART_SMTP_PASSWORD` / `STALWART_JMAP_PASSWORD` · the Upstash `KV_URL`/`REDIS_URL`
password · `INGESTION_WORKER_TOKEN`

**This was my error** — the project's own notes warn that `ps aux | grep dokploy` and
`cat /etc/cron.d/buildairesume` leak credentials and must be redacted, and `docker service inspect` has the
same property. I should have filtered the output to key *names*.

You said not to worry about the cron secret specifically. But this is a wider set, and rotation is
cheapest *before* the worker migration, because the new app's env has to be typed in by hand anyway — you
would rotate and enter the new values in one pass instead of doing it twice.

Suggested order: rotate → create the worker app with the new values → verify → remove the old service.

---

## 10. The queued data normalisation — and why it should be dropped, not deferred

`SB-06` fixed the **reads**: every query on a `Schema.Types.Mixed` path now goes through `mixedIdFilter(id)`
→ `{ $in: [raw, ObjectId(raw)] }`, which matches either stored shape. That fix is **correct and deployed to the
app tier** (it is in `47d46c30`, which built `36ace7eb4437`).

What followed from it was a proposal to also **rewrite the stored data** so every path holds one shape. A dry
run of `.verify/normalise-mixed-ids.mjs` against production found **746 values it would convert**, across 20
paths, with no anomalies.

**That proposal is wrong. Do not run it.** Two independent reasons:

### 10.1 The shapes are not corruption — they are per-path consistent with the writers

The dry run counted *shapes*; it did not ask *who writes them*. Reading the writers settles it:

| Path | Writer | Passes |
| --- | --- | --- |
| `ApplicationQueue.applicationId` | `jobs/auto-apply/route.ts:268` | `jobApp._id` → **ObjectId** |
| `ApplicationQueue.userId` | same, `:269` | `auth.userId` → **string** |
| `ApplicationQueue.jobId` | same, `:270` | `jobApp.jobId \|\| jobApp._id.toString()` → **string** |
| `JobApplication.userId` | `jobs/auto-apply/route.ts:199`, `unifiedApplyService.ts:596`, … | `userObjId` → **ObjectId** |
| `JobApplication.userId` | `jobs/naukri/auto-apply/route.ts:124`, `jobs/indeed/auto-apply/route.ts:123` | `auth.userId` → **string** |

The measured counts match this exactly — `applicationqueues.userId` is 52 string / 1 objectId, and
`jobapplications.userId` is 84 objectId / **15 string**. **The 15 strings are the naukri and indeed routes.**
The store is not inconsistent with itself; two call sites disagree with the other ten.

So a bulk rewrite to `objectId` **fights the writers**: the very next naukri submission writes a string again,
and the drift returns — now with the added cost that the 746 documents were rewritten for nothing. Worse,
`ApplicationQueue.jobId` is the **external** job id (`jobApp.jobId || app._id.toString()`); it is not always a
24-hex ObjectId, so canonicalising it is not merely unhelpful, it is **wrong**.

**The correct fix is at the writer, not the data**: make the two minority routes pass an ObjectId like the
other ten, and let `mixedIdFilter` cover the existing rows on read forever. That is a ~2-line change per route,
it needs no maintenance window, and it cannot lose data.

### 10.2 Even if we wanted the rewrite, it must follow the worker — not precede it

The worker currently runs `029e44d7f146`, i.e. the code *before* `47d46c30` — **the code that does not have
`mixedIdFilter`**. That older code reads Mixed paths with raw equality. Concretely, `journeyDocumentService`
queries `CoverLetter.journeyId` with `.toString()`.

Normalising `coverletters.journeyId` to ObjectId while the worker still runs raw-equality reads would turn its
partial miss into a **total** miss — the worker would stop finding cover letters and would submit without them.
That is the same class of failure the whole investigation started from.

**So: never normalise before the worker is current.** The stopgap nudge (`docker service update --force
--image …`) is sufficient to make it *safe*; it is not sufficient to make it *worthwhile* — see 10.1.

### 10.3 What to do instead

1. **Drop the bulk rewrite.** Keep `.verify/normalise-mixed-ids.mjs` as the measurement tool it proved to be,
   and leave `APPLY=1` unused.
2. **Fix the two minority writers** (`naukri/auto-apply`, `indeed/auto-apply`) to pass `ObjectId`. Small,
   reviewable, no data touched.
3. **Keep `mixedIdFilter` on reads permanently.** It is cheap, idempotent, and is what makes the existing rows
   reachable — it is the actual fix, not a stopgap.
4. **Run the scanner in CI.** `.verify/scan-mixed-id-queries.mjs` reporting `0` is the invariant that keeps
   this from regressing — and remember it was itself blind to barrel imports until 2026-09-27.

---

## 11. The admin panel — what it depends on, and what the move actually changes

You asked to be sure the worker and microservices shown in the admin panel keep working when the
containers move. Measured 2026-09-27.

### 11.1 The panel probes three separate things, all by env var

`GET /api/admin/vps-setup` (`src/app/api/admin/vps-setup/route.ts:325-329`) probes three remote
services in parallel:

| Panel section | Env var | What it actually is | In this migration? |
| --- | --- | --- | --- |
| `workerLoop` | `WORKER_HEALTH_URL` | the app's own in-process loops — `buildairesume-worker-daemon` today | **yes — this is the thing being moved** |
| `ingestionService` | `INGESTION_SERVICE_URL` | the ingestion microservice (SmartRecruiters/Workable/Recruitee/Personio/BambooHR) | **Phase 2** |
| `workerGateway` | `INGESTION_WORKER_URL` | the Python JobSpy/LinkedIn gateway | no — it stays on the host |

All three are read from `process.env` **at request time**, so the panel follows the env vars, not the
container topology. Nothing is keyed to a container name or a Swarm service id.

### 11.2 `WORKER_HEALTH_URL` is not set anywhere today

```
buildairesume-app-vmvp35      WORKER_HEALTH_URL: (unset)
buildairesume-worker-daemon   WORKER_HEALTH_URL: (unset)
```

So `probeWorkerHealth(getWorkerHealthUrl())` returns `null` and the route answers
`workerLoop: { configured: false, … }` — and the code is explicit (`route.ts:366-367`) that this means
**"unknown", not "unhealthy"**.

**The panel cannot see the worker today, and the migration does not change that either way.** It is,
however, the first opportunity to fix it: a Dokploy app on `dokploy-network` is addressable by its
service name, so `WORKER_HEALTH_URL=http://<new-worker-service>:8791` would populate that section for
the first time. Worth doing as part of the cutover.

### 11.3 ⚠️ The network finding — and it inverts the obvious "tidy-up"

Both the app and the worker are already on `dokploy-network` (`3qw5bnsbfhm9jkaq3u253wesb`,
`10.0.1.0/24`, gateway `10.0.1.1`). But they reach the host services through **different** addresses:

| Service | `INGESTION_SERVICE_URL` | `INGESTION_WORKER_URL` |
| --- | --- | --- |
| app | `http://172.17.0.1:4001` | `http://172.17.0.1:8790` |
| worker | `http://172.19.0.1:4001` | `http://172.19.0.1:8790` |

`172.17.0.1` is the default `bridge` gateway; `172.19.0.1` is `server-mgmt-network`'s. Both host
services bind `0.0.0.0` (`:4001` ingestion, `:8790` the python3 gateway).

Probed **from inside the worker container** (`.verify/probe-worker-network.mjs`):

| Address | Result |
| --- | --- |
| `10.0.1.1:4001` — the dokploy-network gateway | **FAIL** (`fetch failed`) |
| `10.0.1.1:8790` | **FAIL** |
| `172.19.0.1:4001` | **OK 200** `{"status":"healthy",…}` |
| `172.17.0.1:4001` | **OK 200** |
| `172.19.0.1:8790` | **OK 401** — reachable; needs the bearer token, which `probeWorkerGateway` sends |

**Two conclusions, both counter-intuitive:**

1. **`172.17.0.1` and `172.19.0.1` are not specific to the current containers.** They are generic
   host-bridge gateways, and they are reachable from a container sitting on `dokploy-network`. A new
   Dokploy worker lands on that same network and reaches the same addresses. **So moving the worker
   does not break host-service connectivity, as long as the new app's env carries the same values.**
2. **Do not "tidy" these to the network gateway `10.0.1.1`.** It does not work. Whatever the cause
   (most likely the host firewall dropping traffic to the swarm ingress gateway), it is *measured*, and
   the `172.x` addresses are the ones that work.

### 11.4 The one thing that genuinely *would* break the panel

**Phase 2 — moving the ingestion microservice.** The panel's `ingestionService` section follows
`INGESTION_SERVICE_URL`, which is currently a **host-published port** (`:4001`). If the microservice
moves under Dokploy:

- **keep it published on the same host port** → the URL is unchanged and nothing breaks; or
- address it by service name → then **both** `INGESTION_SERVICE_URL` **and** `INGESTION_WORKER_URL`
  must be updated on **both** the app and the worker, or the panel's ingestion section goes dark and
  the worker loses its gateway.

That is the whole risk, and it is a **config change, not a code change.**

### 11.5 Additions to the §6 verification checklist

- [ ] the new worker app's env carries `INGESTION_SERVICE_URL` and `INGESTION_WORKER_URL` with the
      **same `172.x` values** as the old service — **not** `10.0.1.1`;
- [ ] re-run `.verify/probe-worker-network.mjs` **inside the new container** and confirm the two
      `172.x:4001` probes return `200`;
- [ ] set `WORKER_HEALTH_URL` on the **app** to the new worker's service name + `:8791`, so the admin
      panel's `workerLoop` section reports for the first time;
- [ ] `GET /api/admin/vps-setup` still returns `ingestionService.reachable: true` and
      `workerGateway.online: true` after the cutover;
- [ ] `workerLoop.commit` is populated and `workerLoop.commitStale` is `false` — see §11.6.

### 11.6 Added 2026-09-27: the worker now reports *which build* it is running

The panel could already say the worker was **reachable**. It could not say whether it was **current** —
and "the worker is stale after a deploy" is the failure this whole migration exists to remove (§1). The
old worker's health payload carried `role`, `pid`, `startedAt`, `uptimeSeconds`, `memoryRssMb` and
`loops` — no version. `/api/health` has reported `commit` for the web process all along; the worker had
no equivalent, so a stale worker was indistinguishable from a healthy one in the UI.

Three small additions close that:

- `src/workers/health.ts` — `WorkerHealthPayload.commit`, plus `resolveBuildCommit()`, which reads
  `GIT_COMMIT || SOURCE_COMMIT || 'unknown'` (the same two variables `/api/health` reads).
- `Dockerfile` — the `worker` stage now declares `ARG GIT_COMMIT` / `ENV GIT_COMMIT`, exactly as
  `builder` does. `worker` is `FROM base`, so it never inherited `builder`'s ENV; this is a new
  declaration, not a preserved one.
- `src/app/api/admin/vps-setup/route.ts` — the `workerLoop` projection carries `commit` and
  `commitStale`, the latter comparing the worker's commit against the **web container's own**
  (`resolveBuildCommit()` on the app side).

`commitStale` is deliberately **tri-state**, following the file's existing "unknown is not unhealthy"
convention: it is `null` — not `true` — whenever either side reports `unknown`, because a missing build
arg is not evidence of drift. `VpsSetupPanel.tsx` renders a `Stale image` chip and an explanatory line
only on a strict `true`.

**Consequence for this migration:** after the cutover, §6 step 6 is the cheapest possible proof that the
new worker is real and current — and it will catch the old failure mode the next time Dokploy redeploys
only the web tier.
