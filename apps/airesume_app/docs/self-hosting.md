# Self-hosting

How to run your own AIResume instance. This guide covers the two deployable projects, the optional
host services, and the failure modes that are easy to hit and hard to diagnose.

Everything here is generic. It describes how the software behaves, not how any particular instance is
configured.

---

## 1. Prerequisites

| Requirement | Notes |
| --- | --- |
| **Node.js 22** | Both projects. `engines` enforces `>=22`. |
| **MongoDB** | The primary datastore. A single replica set or a hosted cluster; the app uses transactions. |
| **Object storage** | S3-compatible, for uploads and generated files. Large binaries are deliberately not stored in MongoDB. |
| **Docker** | Only if you deploy in containers. Both projects run fine from a source checkout. |
| **A domain and TLS** | Auth cookies are `Secure` in production, so a plain-HTTP origin will not hold a session. |

There is no Postgres. MongoDB is the datastore and the schema is designed around it.

## 2. The two projects

They are independent: separate `package.json`, separate lockfile, separate `.env.example`, separate
Dockerfile. Installing one never drags in the other's dependencies.

```
apps/airesume_app/                    the Next.js web app + its background workers
apps/resumebuilder-worker/   the job-ingestion service
```

### Run from source

```bash
# web app
cd apps/airesume_app
cp .env.example .env.local     # fill in your own values — see configuration.md
npm ci --legacy-peer-deps      # the same flags the production image uses
npm run dev                    # http://localhost:3000

# job-ingestion service
cd apps/resumebuilder-worker
cp .env.example .env
npm ci
npm run dev
```

A thin task runner at the repository root delegates to both:

```bash
npm run dev            # → apps/airesume_app dev server
npm run build          # → apps/airesume_app production build
npm run build:worker   # → bundle the app's background worker
npm run test           # → apps/airesume_app test suite
npm install:all        # → npm ci in both projects
```

## 3. Containers

### The app image builds two targets

One Dockerfile at the repository root, build context `.` (the repository root):

| Target | What it is |
| --- | --- |
| `runner` | The Next.js web tier. This is the default. |
| `worker` | The background loops — email delivery, inbound mail ingestion, the application queue, the reconciliation watchdog. |

```bash
docker build -t airesume-web    --target runner .
docker build -t airesume-worker --target worker .
```

**Why the worker is a separate container.** Those loops used to run inside the web container, which
meant every site redeploy killed them mid-flight — an application could be abandoned halfway through
submission. Splitting them means the web tier can be redeployed freely.

Two settings make this work, and getting either wrong is silent:

1. **On the web service, set `WORKER_ROLE=web`.** Without it the web container starts the loops
   itself and you are back to the original problem.
2. **On the worker service, leave `WORKER_ROLE` unset** (it defaults to running everything) or set it
   to `worker`. **Never set `WORKER_ROLE=web` on the worker** — every loop stops, and nothing errors.
   The symptom is simply that no mail is delivered and the queue stops draining.

Set `WORKER_HEALTH_URL` on the web service to the worker's health endpoint so operational endpoints
can report whether the loops are actually running. The worker's health port is internal to the
container network — do not publish it.

`WORKER_SHUTDOWN_GRACE_MS` is how long an in-flight application may finish before the worker exits.
Your orchestrator's stop grace period must be **larger** than this, or the container is killed before
the worker can finish and you lose the work.

### The ingestion service

`apps/resumebuilder-worker/Dockerfile`, build context `apps/resumebuilder-worker`. Fully
self-contained — it does not read from the repository root.

## 4. Optional host services

The production app image ships no Python, no Chromium, and no `scripts/`. Capabilities that need them
run as services on the host instead, and the app is pointed at them by environment variable.

| Capability | Variable | When it is absent |
| --- | --- | --- |
| Job discovery via JobSpy / LinkedIn workers | `INGESTION_WORKER_URL` + `INGESTION_WORKER_TOKEN` | Ingestion skips those sources. |
| The ingestion microservice and its ATS sources | `INGESTION_SERVICE_URL` | Those sources are skipped; the admin job-intelligence page loses its health feed. |
| Headless Chrome over CDP, for Auto-Apply | `PLAYWRIGHT_REMOTE_URL` or `PUPPETEER_BROWSER_WS_ENDPOINT` | Auto-Apply routes to manual review. |
| Local transcription | `WHISPER_WORKER_URL` | Transcription is unavailable. |
| A local model endpoint | `OLLAMA_BASE_URL` | Reported as `unknown` by the deep health check. |

**This degradation is the designed behaviour, not a misconfiguration.** A missing optional service
removes one capability and leaves the rest of the product working. Do not set the `*_ALLOW_LOCAL_*`
escape hatches in production — they exist for a host that deliberately runs Python and Chromium
beside the app.

PDF export follows the same rule: with no headless browser available it falls back to a client-side
renderer rather than failing the request.

## 5. Things that bite

**Cron routes fail closed.** Every `/api/cron/*` route returns `503 CRON_NOT_CONFIGURED` when no
secret is set and `401 CRON_UNAUTHORIZED` when the secret does not match. This is intentional — a
cron endpoint that runs unauthenticated because a variable was forgotten is worse than one that
refuses. Both `Authorization: Bearer <CRON_SECRET>` and `X-Api-Key: <CRON_API_KEY>` are accepted.
Query-string keys are rejected.

**A build must never require a runtime secret.** Configuration is resolved lazily at request time.
If a build starts demanding a secret, that is a regression, not a setup step.

**Auth sessions are per-host.** The session cookie is host-only, so `app.example.com` and
`admin.example.com` are separate sessions by design. `NEXTAUTH_URL` must be the host the app is
actually served from, or the cookie name is derived incorrectly and sign-in appears to succeed while
the session never sticks.

**Application email has no fallback sender.** With no sender configured, queued application emails
transition to `failed` with a non-retryable error naming the missing variable. There is deliberately
no hard-coded default.

**If your mail server is on the same Docker host, do not use its public hostname.** A container
generally cannot hairpin to the host's public name. Use the private network address.

**Do not commit a filled-in environment file.** `.gitignore` covers `.env` and `.env.*` at every
depth with explicit negations for the `.example` templates. Never rename a real file to look like a
template.

## 6. Verifying a deployment

```bash
# app is up and can reach its dependencies
curl -s https://your-host/api/health

# deeper check, including optional services
curl -s 'https://your-host/api/health?deep=1'
```

`/api/health?deep=1` reports optional services as `unknown` when they are not configured — that is
the honest answer, and it is different from `false`, which would mean "configured but broken".

## 7. Further reading

- [Configuration](configuration.md) — every environment variable.
- [App guide](app-guide.md) — what the product does.
- [SECURITY](../SECURITY.md) — the secrets policy, and incident response.
