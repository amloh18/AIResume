# VPS / Worker-Side Fixes — Runbook

Source: forensic audit 2026-09-24 (see `docs/application-automation/fix-tasks.md` for the full task
list). Every **V**-prefixed task in that file is executed here. None of this can be done from the
repo — it is host, Dokploy and DNS work — so it ships as instructions instead of code.

**Do not run these against production without reading each section's rollback note.**
Read-only inspection commands are marked `# READ`.

Legend: ✅ = verified by inspection during the audit · ⬜ = not yet executed

---

## 0. Access pattern

```bash
# READ — inspect without changing anything
sshpass -p '<VPS_SUDO_PASSWORD>' ssh \
  -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
  amloh@192.168.1.8 '<read-only command>'

# …and for anything that writes, wrap the command with sudo via the password on stdin:
sshpass -p '<VPS_SUDO_PASSWORD>' ssh … amloh@192.168.1.8 \
  "echo '<VPS_SUDO_PASSWORD>' | sudo -S <command>"
```

Site: `https://resume.morigrid.com` · deployment: Docker + Dokploy · DB: MongoDB Atlas (`airesume`)
· production commit at audit time: `348be8f4` on `refactor/simple`.

> **Password is deliberately not recorded in this file.** Rotate it after the audit anyway (it
> travelled in shell history during inspection).

---

## 1. Worker role / worker-daemon (V3.1–V3.4) ⬜

The repo side is done: `Dockerfile` has a real `worker` target with `ENV WORKER_ROLE=worker` baked
in, `src/workers/roles.ts` resolves role → loop plan, and `/api/health` now **reports** `worker.role`
+ `worker.loops` so you can confirm the wiring with a curl instead of an SSH session.

| Task | Action |
|---|---|
| V3.1 | Set `WORKER_ROLE=worker` on the worker-daemon Dokploy service (belt) — the image already bakes it (braces). |
| V3.2 | Build the worker service from the **same image with `--target worker`** (`npm run worker` entrypoint), not `npm run start` / `next start`. |
| V3.3 | `Restart=unless-stopped` (Dokploy restart policy → "always") on worker-daemon. |
| V3.4 | Remove any published HTTP port from the worker container — it serves no HTTP. |

```bash
# READ — see which role each running container resolved
for c in $(docker ps --format '{{.Names}}' | grep -i -E 'buildairesume|worker'); do
  echo "== $c"; docker exec "$c" printenv WORKER_ROLE 2>/dev/null || echo "(unset → role 'all')"
done

# After redeploy — the two curls that prove the split worked:
curl -s https://resume.morigrid.com/api/health            | jq '.worker'   # web tier → {"role":"web","loops":[]}
curl -s https://resume.morigrid.com/api/health?deep=1     | jq '.commit'   # must equal the deployed SHA
```

Expected after correct wiring:

- web container → `{"role":"web","loops":[]}` — **no background loops on the web tier**
- worker container → `{"role":"worker","loops":["email","emailIngestion","applicationQueue","reconciliation"]}`
- `commit` on `/api/health` equals `git rev-parse --short refactor/simple` on your machine — this is
  the deploy-drift check that previously had no answer (R1.2).

**Failure mode to watch:** both tiers reporting `role: "all"` means V3.1 was skipped and the loops
still run on the web container (redeploys interrupt them). Both reporting `web` means *nothing* runs
the queues — applications will sit at `queued`.

Rollback: unset `WORKER_ROLE` on both services → single-container `all` behaviour (the audited
status quo).

---

## 2. Secrets & file permissions (V4.1–V4.4) ⬜

Repo side done: the Atlas URI is gone from `tests/e2e/job-pipeline.e2e.test.ts`, `docs/MIGRATION.md`
AWS keys are redacted, `env.example`'s Firebase key is a placeholder, `.gitignore` now covers
`.env*`, `*.cookies`, `*.key`. **Git history still contains the rotated values** — rotation, not
history rewrite, is the fix.

| Task | Action |
|---|---|
| V4.1 | `chmod 600 /etc/cron.d/buildairesume` (audit found `0644` with a live bearer token world-readable). Move the token into an env file (below) and reference it with `CRON_SECRET=…` — cron job lines read env files via `. /etc/default/buildairesume` style sourcing. |
| V4.2 | Gateway token: move out of the systemd unit's `Environment=` line into `/etc/buildairesume/gateway.env` with `0600 root:root`, loaded via `EnvironmentFile=`. `systemctl daemon-reload && systemctl restart <gateway-unit>`. |
| V4.3 | **Rotate** (create new → update config → verify → revoke old): ① GitHub `ghs_…` token stored in the Dokploy GitHub remote ② cron bearer token (`CRON_SECRET`/`CRON_API_KEY`) ③ gateway token ④ Atlas password (URI is in git history — assume public) ⑤ the AWS keys from `docs/MIGRATION.md` history (`AKIA…` — key IDs are not secrets but the pair was committed together) ⑥ Stripe/Live keys if the repo leak is judged wider than the VPS. |
| V4.4 | Scrub the LinkedIn session cookie from `/home/amloh/.bash_history`: `sed -i '/li_at/d; /linkedin.*cookie/d' ~/.bash_history`, then **rotate the LinkedIn session** (change password / "sign out all sessions") — history scrub does not invalidate a stolen cookie. |

```bash
# READ — confirm the cron file's current mode and that it no longer contains a raw token after V4.1
ls -l /etc/cron.d/buildairesume
sudo grep -c 'CRON_SECRET' /etc/cron.d/buildairesume   # target: 0 after moving to env file
ls -l /etc/buildairesume/gateway.env                    # target: -rw-------
sudo grep -Eo 'Environment=' /etc/systemd/system/<gateway>.service | wc -l   # target: 0
```

Rollback: keep a copy of each old value until the new one is verified working
(`curl -H "Authorization: Bearer $NEW" https://resume.morigrid.com/api/cron/billing` → `200`,
not `401`).

---

## 3. Network exposure (V6.1–V6.4) 🔴 ⬜

Audit: **UFW inactive**, CDP port `9222` reachable from the LAN (`socat` publishing it), ingestion
gateway listening `0.0.0.0:8790`, plus Samba/VNC/Ollama/4001/3000/3001 listeners.

```bash
# READ — inventory first, decide the deny list from evidence, not guesses
sudo ss -tlnp | awk 'NR==1 || $4 ~ /0\.0\.0\.0|\*/'
sudo ufw status verbose
```

| Task | Action |
|---|---|
| V6.1 | `sudo ufw default deny incoming` · `sudo ufw allow 22/tcp` · `sudo ufw allow 80/tcp` · `sudo ufw allow 443/tcp` · `sudo ufw --force enable` — **add any other port you actually use first** (e.g. Dokploy's面板 port, SMTP 25/465/587 if Stalwart runs here, 993/465 inbound). |
| V6.2 | CDP `9222`: remove the `0.0.0.0` socat publish; keep Chrome's `--remote-debugging-port=9222` bound to `127.0.0.1` (app container reaches it via `PLAYWRIGHT_REMOTE_URL=http://127.0.0.1:9222` only if same-host networking is preserved — verify after the change with an actual apply run). |
| V6.3 | Gateway `8790`: change the socat/systemd listen address from `0.0.0.0:8790` to the docker bridge (e.g. `172.17.0.1:8790`) — the app reaches it through `INGESTION_WORKER_URL=http://172.17.0.1:8790`, which keeps working. |
| V6.4 | From the inventory: decide per listener — Samba/VNC/Ollama → bind `127.0.0.1` or firewall-drop; ingestion `4001`/apps `3000/3001` → covered by UFW. Document anything intentionally public. |

Order matters: **inventory → allow rules → enable UFW → then tighten binds.** Enabling UFW first
with an unknown allow-list is how the admin locks themselves out (keep a console/VNC session open).

Rollback: `sudo ufw disable`. For bind changes: revert the unit/`socat` line and `systemctl restart`.

---

## 4. Email / external services env (V7.1, V7.2, V8.6) ⬜

Repo side: the application-email queue now has a producer (`POST /api/applications/[id]/email`),
the worker claims `retrying` items, SMTP config is **required** (all hard-coded fallbacks removed —
see §5 of this file), and reconciliation reads the real `communications` collection.

| Task | Action |
|---|---|
| V7.1 | Add to the **app container** env (Dokploy service environment): `STALWART_JMAP_URL=http://172.19.0.1:8085/jmap` (adjust gateway IP to the actual private Docker network) and `OLLAMA_BASE_URL=http://<ollama-host>:11434` — or leave unset, in which case `/api/health?deep=1` now reports them as `unknown` instead of hanging. |
| V7.2 | Verify **hairpin reachability from inside the container** — this is what broke the old health endpoint: `docker exec <app> sh -lc 'nc -zv mail.morigrid.com 443'` (audit: times out — no NAT reflection). If the container must reach Stalwart, use the **internal** `172.x` address, never the public hostname. |
| V8.6 | `WHISPER_WORKER_URL=127.0.0.1:7878`-style dead value: either remove it from the app env or add a real `buildairesume-whisper-worker` unit. `grep -r whisper` in the service env first — if nothing consumes it at runtime, remove. |

Verification:

```bash
# READ — from inside the app container
docker exec <app-container> printenv | grep -E 'STALWART_JMAP_URL|OLLAMA_BASE_URL|WHISPER'
curl -s 'http://127.0.0.1:3000/api/health?deep=1' | jq '.checks.externalServices'
```

---

## 5. Email sender configuration is now **mandatory** ⬜ (new requirement from R7)

The audit-era code shipped hard-coded SMTP fallbacks (`192.168.1.8`, a brevo account address) and a
default sender `admin@morigrid.com`. All removed: `sendApplicationEmail` now **fails closed
(non-retryable)** when configuration is missing, and the queue producer requires an explicit sender.

Set on the **app and worker** services:

```bash
STALWART_SMTP_HOST=172.19.0.1          # internal Docker address, port 587 implied
STALWART_SMTP_PORT=587
STALWART_SMTP_USER=<mailbox user>       # only if Stalwart requires AUTH on submission
STALWART_SMTP_PASSWORD=<from secret store — never in git>
APPLICATION_SENDER_EMAIL=<a real, DKIM-aligned From address>   # REQUIRED — no default
# Legacy alias also honoured: EMAIL_SERVER_HOST / EMAIL_SERVER_PORT / EMAIL_SERVER_USER / EMAIL_SERVER_PASSWORD
```

Verification after restart:

```bash
# 1. config visible in the worker
docker exec <worker> printenv APPLICATION_SENDER_EMAIL

# 2. end-to-end: queue one email for an owned application, then watch it leave the queue
curl -s -X POST https://resume.morigrid.com/api/applications/<APP_ID>/email \
  -H "Authorization: Bearer <session>" -H 'Content-Type: application/json' \
  -d '{"subject":"Application for <role>","body":"…"}'        # → 202 + queueItemId
# then in Mongo: applicationemailqueues → status moves queued → sending → sent
# a missing sender config now yields status failed with lastError mentioning APPLICATION_SENDER_EMAIL,
# and it does NOT retry (non-retryable by design) — fix the env, then re-enqueue.
```

Rollback: none needed for old data — the incoming `applicationemailqueues` collection had **0
documents** at audit time, so no legacy rows depend on the old defaults.

---

## 6. Resources: swap exhaustion / OOM (V10.1–V10.3) ⬜

Audit: swap `9.1/9 Gi` used, `hermes` crash-looping, unbounded `llama-server`, no cgroup limits on
app/worker.

```bash
# READ
free -h; sudo swapon --show
docker stats --no-stream --format 'table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.CPUPerc}}'
sudo journalctl -u <hermes-unit> --since '-10 min' | tail
```

| Task | Action |
|---|---|
| V10.1 | Offload unrelated containers (anything not serving resume.morigrid.com / its workers) to another host or stop them: `docker ps` → `docker stop <name>`. Biggest wins first: anything with a local LLM (`llama-server`, Ollama, hermes). |
| V10.2 | Stop the crash-loop: `sudo systemctl stop <hermes> && sudo systemctl disable <hermes>` (or fix its cause), and cap the model server (`--mem-max`, or drop the model size) so it cannot take the page cache with it. |
| V10.3 | Set explicit limits on the app + worker services in Dokploy: memory `limit`/`reservation` (start ~1–2 Gi app, 1 Gi worker) and CPU quota. Containers without limits are what turned one OOM into a host-wide stall. |

Rollback: limits are per-service config — raise/remove and redeploy.

Verification: `free -h` swap trending down over 24 h; `docker stats` shows no container at ~100 % of
its limit; app stays responsive during an ingestion run.

---

## 7. Ingestion build source & DNS (V13.1–V13.3) ⬜

| Task | Action |
|---|---|
| V13.1 | `buildairesume.com` apex: either add the missing DNS record (A/AAAA → VPS, or CNAME to the same target as `resume.morigrid.com`, proxied) **or** record in `docs/deployment/` that the domain is intentionally unused. `dig +short buildairesume.com` before/after. |
| V13.2 | Ingestion container: rebuild from the git repo (image built by CI/Dokploy from `refactor/simple`) instead of `docker build /opt/cvcircle-build`. Point the Dokploy service at the repo, delete the manual build step. |
| V13.3 | `/opt/cvcircle-build`: `git init && git remote add origin <repo> && git fetch && git checkout refactor/simple` (or delete it once V13.2 lands) so there is one source of truth instead of an untracked tree that can silently diverge from production. |

> Repo-side check done: `docs/deployment/repository-audit.md` is referenced by **no** document (the
> only mention is the task line itself); the real file lives at
> `docs/application-automation/repository-audit.md`. Nothing to fix beyond this note (V13.4).

---

## 8. Test-environment expectations ⬜ (informational)

- `tests/e2e/job-pipeline.e2e.test.ts` now **throws if `MONGODB_URI` is unset** — it never reads a
  baked-in URI again. Running it needs a local (or explicitly provided) MongoDB; without one it
  fails fast with a clear message instead of touching Atlas.
- The unit/integration suite (`npx vitest run`) is fully offline: 6 known failures are environmental
  (2 “no test suite found” files, 4 e2e-needs-server+DB). Do not “fix” those by wiring prod
  credentials into CI.

---

## 9. Execution order (recommended)

1. **Inventory** (all `# READ` commands) — 10 min, zero risk.
2. **Rotate secrets** (V4.3) while the old ones still work; **file modes** (V4.1/V4.2/V4.4).
3. **Network** (V6): allow-list → `ufw enable` → tighten 9222/8790 binds.
4. **Email env** (V5/V7) on app+worker, restart, send one real queue email.
5. **Worker split** (V3) on next deploy — verify with the two health curls.
6. **Resources** (V10) — limits before removing the swap pressure causes.
7. **DNS/build source** (V13) — last, no dependency.

After every step: `curl -s https://resume.morigrid.com/api/health?deep=1 | jq '{status, commit, worker}'`
must return `status != unhealthy`, the expected `commit`, and the expected `worker` role.
