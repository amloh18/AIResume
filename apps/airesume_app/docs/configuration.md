# Configuration

Every environment variable the app reads, grouped by area. **Required** means the product does not
function correctly without it; everything else degrades a specific capability.

Configuration lives exclusively in environment files. Only `.env.example` templates are committed,
and they contain placeholders — never real values. See [SECURITY](../SECURITY.md).

Copy the template and fill it in:

```bash
cp apps/airesume_app/.env.example                  apps/airesume_app/.env.local
cp apps/resumebuilder-worker/.env.example apps/resumebuilder-worker/.env
```

---

## Core

| Variable | Required | Notes |
| --- | --- | --- |
| `MONGODB_URI` | **Yes** | Connection string. The app uses transactions, so a replica set or a hosted cluster is expected. |
| `MONGODB_DB` | No | Overrides the database name. Default: taken from the URI. |
| `NEXTAUTH_URL` | **Yes** | The exact origin the app is served from. Wrong value ⇒ sign-in succeeds but the session never sticks. |
| `NEXTAUTH_SECRET` | **Yes** | Session signing. Rotating it invalidates every active session. |
| `JWT_SECRET` | **Yes** | Application JWT signing. |
| `TOKEN_ENCRYPTION_KEY` | **Yes** | 32-byte hex, AES-256-GCM, for stored third-party tokens. Generate with `openssl rand -hex 32`. |
| `GEMINI_API_KEY` | **Yes** | The primary model provider for tailoring, matching and generated answers. |
| `NODE_ENV` | No | `production` enables `Secure` cookies and strips `console.log` from the client bundle. |

## Authentication providers

Any subset. A provider with no credentials is simply not offered.

| Variable | Notes |
| --- | --- |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Also `NEXT_PUBLIC_GOOGLE_CLIENT_ID` for the client. |
| `GOOGLE_REDIRECT_URI` | Calendar integration callback. |
| `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` / `LINKEDIN_REDIRECT_URI` | LinkedIn sign-in and enrichment. |
| `APPLE_ID` / `APPLE_SECRET` | Sign in with Apple. Requires a Services ID with the callback URL registered. |
| `NEXT_PUBLIC_FIREBASE_*` | Firebase client SDK — phone auth and push. |
| `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` | Firebase Admin SDK. Alternative: `FIREBASE_SERVICE_ACCOUNT_KEY` as a JSON string. |

## Storage

| Variable | Notes |
| --- | --- |
| `UPLOAD_DIR` | Local filesystem fallback, for development. Default `./public/uploads`. |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_S3_REGION` / `AWS_S3_BUCKET_NAME` | S3-compatible object storage. Use this in production. |
| `NEXT_PUBLIC_S3_BASE_URL`, `NEXT_PUBLIC_HERO_BANNER_S3_URL` | Optional public URLs for landing assets. |

Large binaries do not belong in MongoDB. Uploads and generated documents go to object storage.

## Email

Two separate paths, with different configuration.

**Transactional mail** — verification, password reset, notifications:

| Variable | Notes |
| --- | --- |
| `EMAIL_SERVER_HOST` / `EMAIL_SERVER_PORT` / `EMAIL_SERVER_USER` / `EMAIL_SERVER_PASSWORD` | Any SMTP provider. |

**Application email** — the outbound applications pipeline:

| Variable | Required | Notes |
| --- | --- | --- |
| `APPLICATION_SENDER_EMAIL` | **Yes for this feature** | The From address for application mail. There is no hard-coded fallback: without it, queued mail fails with a non-retryable error naming the variable. |
| `STALWART_SMTP_HOST` / `STALWART_SMTP_PORT` / `STALWART_SMTP_USER` / `STALWART_SMTP_PASSWORD` | No | A Stalwart mail server. If it runs on the same Docker host, use the **private network address**, not the public hostname — a container generally cannot hairpin to the host's public name. |
| `STALWART_JMAP_URL` | No | Inbound polling for the communications tab. |

## Scheduled work

| Variable | Notes |
| --- | --- |
| `CRON_SECRET` | Preferred. Sent as `Authorization: Bearer <secret>`. |
| `CRON_API_KEY` | Legacy. Sent as `X-Api-Key`. |

Every `/api/cron/*` route **fails closed**: `503 CRON_NOT_CONFIGURED` if neither is set,
`401 CRON_UNAUTHORIZED` on a mismatch. Query-string keys are rejected. This is deliberate — a cron
endpoint that runs because a variable was forgotten is worse than one that refuses.

| Variable | Notes |
| --- | --- |
| `AUTO_APPLY_CRON_BATCH` | Applications per auto-apply run. Default 5, max 20. Browser work is heavy — keep it low. |

## Background workers

| Variable | Notes |
| --- | --- |
| `WORKER_ROLE` | Set to `web` on the **web** service. Leave unset (runs everything) or set to `worker` on the **worker** service. **Never `web` on a worker** — every loop stops silently. |
| `WORKER_HEALTH_PORT` | The worker's status port. Internal to the container network; do not publish it. |
| `WORKER_HEALTH_URL` | On the web service: where the worker answers health checks. Unset ⇒ ops endpoints report the loop as not running here rather than guessing. |
| `WORKER_SHUTDOWN_GRACE_MS` | How long an in-flight application may finish. Must be **less** than the orchestrator's stop grace period. |
| `WORKER_HEARTBEAT_MS` / `WORKER_HEALTH_HOST` | Tuning. |

## Optional host services

All optional. When a variable is empty the capability is unavailable and the product degrades
predictably — see [self-hosting](self-hosting.md) §4.

| Variable | Notes |
| --- | --- |
| `INGESTION_WORKER_URL` / `INGESTION_WORKER_TOKEN` | JobSpy and LinkedIn discovery workers. |
| `INGESTION_SERVICE_URL` | The ingestion microservice and its ATS sources. |
| `PLAYWRIGHT_REMOTE_URL` / `PUPPETEER_BROWSER_WS_ENDPOINT` | Headless Chrome over CDP, for Auto-Apply. Accepts an `http://` CDP base URL or a browser-level `ws://` URL. |
| `WHISPER_WORKER_URL` | Local transcription. |
| `OLLAMA_BASE_URL` | A local model endpoint. Reported as `unknown` when unset. |
| `BROWSER_ALLOW_LOCAL_LAUNCH` / `ALLOW_LOCAL_INGESTION_WORKERS` | Escape hatches for a host that runs Python and Chromium beside the app. Leave `false` in production. |

## Payments

Any subset; the provider in use is configurable at runtime.

| Variable | Notes |
| --- | --- |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET` / `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Razorpay. |
| `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` / `STRIPE_WEBHOOK_SECRET` | Stripe. |
| `POLAR_ACCESS_TOKEN` / `POLAR_WEBHOOK_SECRET` | Polar. Legacy, deprecated. |

## LinkedIn worker

Only relevant if you run the LinkedIn discovery worker on a host.

| Variable | Notes |
| --- | --- |
| `LINKEDIN_ENABLED` | Master switch. Default `false`. |
| `LINKEDIN_BROWSER_PROFILE_DIR` | Must be a persistent directory. |
| `LINKEDIN_INGEST_API_URL` | Where the worker posts results. |
| `LINKEDIN_REGION_STRATEGY` | `demand` \| `round-robin` \| `fixed`. |
| `LINKEDIN_REGIONS`, `LINKEDIN_MAX_REGIONS_PER_RUN` | Region rotation. |
| `LINKEDIN_MAX_SEARCHES_PER_RUN`, `LINKEDIN_MAX_PAGES_PER_SEARCH`, `LINKEDIN_MAX_JOBS_PER_SEARCH` | Per-run search limits. |
| `LINKEDIN_MAX_RUNTIME_SECONDS`, `LINKEDIN_COOLDOWN_SECONDS`, `LINKEDIN_WORKER_CONCURRENCY` | Runtime limits. |
| `LINKEDIN_DEFAULT_KEYWORD` | Used when no task specifies one. |
| `LINKEDIN_DRY_RUN`, `LINKEDIN_DEBUG`, `LINKEDIN_DEBUG_DIR` | Debugging. |

## Whisper worker

| Variable | Notes |
| --- | --- |
| `WHISPER_ENABLED` | Default `true` where the worker is deployed. |
| `WHISPER_MODEL` | `tiny.en` \| `base.en` \| `small.en` \| `medium.en`. |
| `WHISPER_LANGUAGE`, `WHISPER_DEVICE`, `WHISPER_COMPUTE_TYPE` | `device` and `compute_type` accept `auto`. |
| `WHISPER_MAX_AUDIO_SECONDS`, `WHISPER_MAX_CONCURRENT_JOBS`, `WHISPER_TIMEOUT_MS` | Limits. |

## Observability

| Variable | Notes |
| --- | --- |
| `SENTRY_DSN` / `SENTRY_ORG` / `SENTRY_PROJECT` | Error tracking. |
| `GOOGLE_SITE_VERIFICATION` | Search Console verification. |
| `BACKUP_DIR` / `BACKUP_RETENTION_DAYS` / `BACKUP_WEBHOOK_URL` / `BACKUP_NOTIFY_SUCCESS` / `BACKUP_NOTIFY_FAILURE` | Backup job and its notifications. |

## Reference data

Optional. Populates the sponsorship-verification features.

| Variable | Notes |
| --- | --- |
| `UK_SPONSOR_REGISTRY_URL` | UK register of licensed sponsors (CSV). |
| `US_H1B_DATA_URL` / `US_H1B_DATA_FORMAT` | US H-1B employer data. |
