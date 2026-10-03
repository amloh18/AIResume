# Deploy Verification Checklist — fix/fe-be-integration → refactor/simple

Run after every deployment of the fix pass described in `fix-tasks.md`. Each step answers a
question the fixes introduced; if any answer is wrong, roll back before moving on.

Rollback for the whole pass: the production branch `refactor/simple` still points at `348be8f4`
(pre-fix). Dokploy → redeploy the previous commit/image. Nothing in the pass requires a DB
migration — all schema changes are additive (`mode`, `correlationId` on queue collections; incoming
`applicationemailqueues` had 0 documents at audit time), so rolling the code back against the new
documents is safe (extra fields are ignored by old readers).

---

## 1. Commit & identity (R1.2)

```bash
curl -s https://resume.morigrid.com/api/health | jq '{commit, version, environment}'
git rev-parse --short refactor/simple         # on your machine — must match .commit
```

- [ ] `.commit` equals the deployed SHA (not `unknown` — `unknown` means the image was built
      without the `GIT_COMMIT` build arg, i.e. the Dockerfile wiring is bypassed).

## 2. Liveness is fast (R2.1–R2.3)

```bash
time curl -s -o /dev/null -w '%{http_code}\n' https://resume.morigrid.com/api/health
```

- [ ] 200, single-digit–low-double-digit milliseconds. (Pre-fix this call hung on a full SMTP TCP
      timeout then returned 503.)
- [ ] `?deep=1` returns within ~8 s and reports each dependency individually:
      `curl -s 'https://resume.morigrid.com/api/health?deep=1' | jq '.checks'`.
- [ ] HEAD `/api/health` also answers 200 (load-balancer probe).

## 3. Worker split (V3)

```bash
curl -s https://resume.morigrid.com/api/health | jq '.worker'
```

- [ ] Web tier → `{"role":"web","loops":[]}`.
- [ ] Worker tier (hit it via an internal/Docker-network curl, or check its logs at startup) →
      `{"role":"worker","loops":["email","emailIngestion","applicationQueue","reconciliation"]}`.
- [ ] NOT both `all` (loops still on web → interrupted by redeploys) and NOT both `web`
      (nothing drains the queues → applications sit at `queued`).

## 4. Proxy / auth hardening (R5, phase 2)

- [ ] `/api/cvs/<id>/metadata` and `/api/cvs/<id>/surgeon-analysis` return **401** without a
      session (pre-fix: public allowlist).
- [ ] A dot-path probe that used to slip past the static-asset check now returns 401/403 rather
      than proxying, e.g. `curl -i https://resume.morigrid.com/api/.env` → 404/403, not file content.
- [ ] `/studio` (any path) → normal auth behaviour, **no** blanket 200-style bypass.
- [ ] Dev-bypass is off: with production `NODE_ENV`, the bypass code path cannot admit a request
      (verify by absence of bypass behaviour on an unauthenticated probe).

## 5. Cron routes (R5.4/R5.5, phase 5)

```bash
# no credentials → 401 (CRON_UNAUTHORIZED)
curl -s -o /dev/null -w '%{http_code}\n' https://resume.morigrid.com/api/cron/billing
# correct bearer → 200
curl -s -H "Authorization: Bearer $CRON_SECRET" https://resume.morigrid.com/api/cron/billing
```

- [ ] Unauthenticated call → 401 for **every** cron route (billing, sessions, ingestion,
      auto-apply, …), not just the migrated ones.
- [ ] With `CRON_SECRET` unset in the app env, routes fail **closed** with 503
      (`CRON_NOT_CONFIGURED`) — never open.
- [ ] Legacy `X-Api-Key: $CRON_API_KEY` header still works (proxied scheduler compatibility).
- [ ] Overlap: firing the same route twice concurrently → second returns
      409 `CRON_ALREADY_RUNNING`. (In-process lock only — documented single-container assumption.)

## 6. Auto-apply mode gate (Q3/R9)

```bash
# enqueue a manual-mode item and watch the worker stop before Playwright
# (auto-apply route persists decision.mode; worker log must show the gate)
```

- [ ] `ApplicationQueue` documents now carry `mode` (`auto|review|manual`, default `review`) and
      `correlationId`.
- [ ] A `manual` queue item ends as `NEEDS_USER_ACTION` / journey `action_required` with **no**
      browser launch in the worker logs.
- [ ] A `review` item prepares documents (journey `ready`) and stops for approval.
- [ ] Re-queueing the same item with `mode: 'auto'` performs the submission (user approval path).

## 7. Application email pipeline (Q2/R7)

```bash
curl -s -X POST https://resume.morigrid.com/api/applications/<APP_ID>/email \
  -H "Authorization: Bearer <session>" -H 'Content-Type: application/json' \
  -d '{"subject":"…","body":"…"}'     # → 202 + queueItemId
curl -s https://resume.morigrid.com/api/applications/<APP_ID>/email \
  -H "Authorization: Bearer <session>"     # → status of the queued email
```

- [ ] POST 202 for an application the session owns; 401/404/403 otherwise (auth + ownership).
- [ ] Queue document transitions `queued → sending → sent` (Mongo:
      `applicationemailqueues`).
- [ ] Attachment path only accepts URLs from the caller's **own** `JobApplication.attachments`
      (SSRF-guarded, ≤5 MB); a foreign/unsupported URL is rejected.
- [ ] Missing `APPLICATION_SENDER_EMAIL`/SMTP config → item `failed` with a non-retryable error
      naming the missing variable (**no** silent fallback to a hard-coded sender).
- [ ] Re-POSTing the same logical email (same subject/idempotency scope) does **not** double-send.
- [ ] Stripe webhook reconstruction (`webhookRetryService`) replays successfully → the shared
      `handleWebhookEvent` path, 4 unknown-signature rejects remain rejects.

## 8. Correlation IDs (R11.3)

```bash
curl -s -D - -o /dev/null https://resume.morigrid.com/api/jobs/auto-apply -X POST \
  -H "Authorization: Bearer <session>" -H 'Content-Type: application/json' -d '{…}' \
  | grep -i x-correlation-id
```

- [ ] Every response carries `x-correlation-id` (minted by the proxy if not supplied).
- [ ] The value supplied by the caller is preserved (echoed back).
- [ ] The `ApplicationQueue`/`ApplicationEmailQueue` doc created by that request stores the same id.
- [ ] Worker logs for processing that item open with that id (log stream joins request → queue →
      worker), and email-worker logs show `retrying`-claim activity under the same trace.

## 9. Secrets & permissions (V4)

- [ ] `grep -R "AKIA\|mongodb+srv://<user>:<password>@" docs/ tests/ env.example` → no live values
      (placeholders only). **History still contains them → rotation is the real control** (see
      `vps-worker-fixes.md` §2).
- [ ] `ls -l /etc/cron.d/buildairesume` → `0600` (was `0644` with a bearer token).
- [ ] Gateway token lives in an `EnvironmentFile` (`0600`), not in the unit file.
- [ ] Rotations completed: GitHub `ghs_` token, cron bearer, gateway token, Atlas URI, AWS pair,
      LinkedIn session (cookie was in `.bash_history`).

## 10. Network (V6)

- [ ] `sudo ufw status` → `active`, allowing only 22/80/443 (+documented exceptions).
- [ ] `ss -tlnp | grep 9222` → `127.0.0.1` only (no `0.0.0.0` socat publish).
- [ ] Gateway `8790` bound to the Docker bridge (`172.17.0.1`), not `0.0.0.0`.
- [ ] A real auto-apply run still reaches the browser after the bind changes
      (`PLAYWRIGHT_REMOTE_URL=http://127.0.0.1:9222` still resolves inside the app container).

## 11. Email/DNS/resources (V7, V10, V13)

- [ ] `dig +short buildairesume.com` → expected record, or the "intentionally unused" note exists.
- [ ] Ingestion container rebuilt from git (`refactor/simple`), `/opt/cvcircle-build` no longer the
      source of truth.
- [ ] `free -h` swap no longer near-full after 24 h; `docker stats` shows app/worker under their
      configured limits; no crash-looping unrelated units.

## 12. Tests on the deployed branch

```bash
npm run lint
npx tsc --noEmit
npx vitest run        # 6 known environmental failures only (2 "no suite" files, 4 e2e-needs-DB)
```

- [ ] Lint clean, type-check clean, no new test failures vs. the baseline.
- [ ] e2e (`tests/e2e/job-pipeline.e2e.test.ts`) fails fast with "MONGODB_URI not set" when run
      without a DB — and is never pointed at production Atlas for CI.

---

**Sign-off:** every box checked → the pass is live. Any red box → capture the failing step's
command output, note it in `fix-tasks.md` under Status Log, and roll back via Dokploy to
`348be8f4` if it affects auth, cron, email or queue draining.
