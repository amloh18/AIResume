# Worker → Dokploy: execution runbook

Companion to `dokploy-worker-migration-plan.md` (the analysis). This is the **do-this** file.

**Decisions taken:** Option A — a second Dokploy **application** over the same repo with
`dockerBuildStage: worker`. Migrate first, rotate the leaked secrets afterwards. You run it; I verify.

**Why now:** the Dockerfile already splits `source → {builder, worker-bundle}`, so the worker target no
longer runs the Next.js build. That is what makes a second application cheap rather than doubling the
build cost under Dokploy's `cleanCache = t`.

**Time:** budget ~40 minutes. The build is a few minutes, not the usual ~18 — the worker target skips the
Next.js build entirely.

**Nothing here is irreversible.** The cutover (step 4) *scales* the old worker to zero rather than removing
it, and it happens only after the new worker has been seen draining real work. Deleting the old service is
a separate, optional, no-rush housekeeping step.

**Risk to users: none.** You have no live users. The old worker keeps draining the queue until step 4.

---

## Step 0 — Pre-flight: capture the rollback state

Nothing is reversible unless you record this first. Run it and keep the output.

```bash
# The image the old worker is on, and its task — the rollback target.
ssh amloh@192.168.1.8 'docker service inspect buildairesume-worker-daemon \
  --format "{{.Spec.TaskTemplate.ContainerSpec.Image}}"'
ssh amloh@192.168.1.8 'docker service ps buildairesume-worker-daemon --no-trunc \
  --format "{{.Name}} {{.CurrentState}}" | head -3'

# The app's current image, for reference.
ssh amloh@192.168.1.8 'docker service inspect buildairesume-app-vmvp35 \
  --format "{{.Spec.TaskTemplate.ContainerSpec.Image}}"'

# The old worker's full service definition, in case you ever need to rebuild it by hand.
# ⚠️ This contains the same secrets as worker-env.txt — treat it identically.
ssh amloh@192.168.1.8 'docker service inspect buildairesume-worker-daemon' > ~/worker-daemon-spec.json
```

Now dump the worker's environment to a **local** file. This is the payload for step 2 — it saves typing 27
values by hand, and it keeps the secrets out of this transcript.

```bash
ssh amloh@192.168.1.8 'docker service inspect buildairesume-worker-daemon \
  --format "{{range .Spec.TaskTemplate.ContainerSpec.Env}}{{println .}}{{end}}"' > ~/worker-env.txt

wc -l ~/worker-env.txt          # expect 27
cut -d= -f1 ~/worker-env.txt    # sanity-check the names; do NOT paste this into chat
```

> ⚠️ `~/worker-env.txt` holds the real secrets. Delete it at the end of step 6
> (`shred -u ~/worker-env.txt` on Linux, `rm -P ~/worker-env.txt` on macOS).

**Note the exact values of the two URLs — the new app must reuse them verbatim:**

```
INGESTION_SERVICE_URL=http://172.17.0.1:4001
INGESTION_WORKER_URL=http://172.17.0.1:8790
```

Do **not** "tidy" these to `10.0.1.1`. That was measured: both `:4001/health` and `:8790/health` **fail**
on the `dokploy-network` gateway, while `172.17.0.1` and `172.19.0.1` return `200` from inside the worker
container. The plan's §11.3 has the raw output.

---

## Step 1 — Create the second application

Dokploy → your project → **Create Application**. Match the existing app exactly, with one difference:

| Setting | Value |
| --- | --- |
| Name | `resumebuiler-worker` (anything; this becomes the service-name prefix) |
| Provider | GitHub — **the same repository** as `resumebuiler` |
| Branch | `refactor/simple` |
| Build type | **Dockerfile** |
| Dockerfile path | `Dockerfile` |
| **Docker Build Stage** | **`worker`** ← the one difference. Must be exactly `worker` |
| Auto Deploy | **on** — this is what fixes SB-01b permanently |
| Clean Cache | on (harmless now; the worker target no longer builds Next.js) |
| Domains | **none** |
| Ports | **none** — do not publish anything |

Leave the environment for step 2.

**Why `dockerBuildStage: worker` matters.** The column exists on all three current apps and is **empty**,
which is why the tag holds the web image and the daemon runs `npm run start` with no `/app/dist/worker.mjs`.
Setting it makes Dokploy pass `--target worker`.

---

## Step 2 — Environment

Open the new app's **Environment** tab and paste the contents of `~/worker-env.txt` (all 27 lines). Dokploy
accepts `KEY=value` bulk paste.

Then add **one** variable:

```
WORKER_HEALTH_URL=http://resumebuiler-worker:8791
```

…using the actual **service name** Dokploy generated (visible on the app's General page as
`appName` — it will look like `resumebuiler-worker-xxxxxxxx`). Revisit this in step 5 if you are unsure.

**Do NOT add `WORKER_ROLE`.** The `worker` Dockerfile stage bakes `WORKER_ROLE=worker`. The old daemon has
it unset (→ `all`), and copying its env therefore leaves it unset, which is correct. Setting
`WORKER_ROLE=web` here would stop every loop — that is the one mistake that turns this into a real outage.

**Do NOT set `PORT`** if you notice it in the file. It is vestigial from the web image; the worker serves
its health on `WORKER_HEALTH_PORT=8791`. Harmless, but it is not needed.

---

## Step 3 — Build, then verify (all must hold)

Click **Deploy** and watch the build log. It should reach `npm run build:worker` and **never** run
`next build` — if you see Next.js compiling, `dockerBuildStage` is not set correctly. Stop and fix it.

Once it is running:

```bash
# 1. It is genuinely the worker image
NEW=<the new service name>
ssh amloh@192.168.1.8 "docker exec \$(docker ps -qf name=$NEW) ls /app/dist"      # → worker.mjs
ssh amloh@192.168.1.8 "docker exec \$(docker ps -qf name=$NEW) ls /app/.next"     # → No such file or directory

# 2. It started every loop
ssh amloh@192.168.1.8 "docker service logs $NEW 2>&1 | head -20"
#   [Worker] starting pid=1 role=worker loops=[email, emailIngestion, applicationQueue, reconciliation]

# 3. Health, from inside the network
ssh amloh@192.168.1.8 "docker exec \$(docker ps -qf name=buildairesume-app-vmvp35) \
  node -e \"fetch('http://$NEW:8791/health').then(r=>r.json()).then(j=>console.log(JSON.stringify(j,null,2)))\""
```

That last call is the one that matters most, and it is new. It should return:

```json
{ "ok": true, "role": "worker", "commit": "<sha>", "loops": { "enabled": [ ... all four ... ] } }
```

- `role` must be `worker` — not `all`, not `web`.
- `commit` must be present. This field did not exist before today; it is how you tell a current worker from
  a stale one **without SSH**.
- `loops.enabled` must list all four.

**Sanity-check the tier split is still right:**

```bash
ssh amloh@192.168.1.8 "docker exec \$(docker ps -qf name=buildairesume-app-vmvp35) \
  node -e \"fetch('http://127.0.0.1:3000/api/health').then(r=>r.json()).then(j=>console.log(j.role, j.commit, JSON.stringify(j.loops)))\""
# → web  <sha>  []
```

If the app's commit and the worker's commit **differ**, the worker did not rebuild — do not proceed to
step 4.

---

## Step 4 — Cut over (reversible)

Both workers can run at once — claiming is an atomic `findOneAndUpdate`, so it is wasteful but not
corrupting. That is what makes this step safe: the old worker keeps draining until the new one is proven.

```bash
# Confirm the new worker has actually drained something before you touch the old one.
# (If the queue is empty, submit one application through the UI and watch it move.)
ssh amloh@192.168.1.8 "docker service logs $NEW 2>&1 | grep -iE 'claimed|completed|processed' | tail -5"
```

Only once you have seen it claim work, **scale the old one to zero — do not remove it yet**:

```bash
ssh amloh@192.168.1.8 'docker service scale buildairesume-worker-daemon=0'
```

This is deliberately **not** `docker service rm`. Scaling to 0 stops the old worker while leaving its full
definition intact, so the rollback is one command:

```bash
ssh amloh@192.168.1.8 'docker service scale buildairesume-worker-daemon=1'
```

Confirm the new worker is the only drainer:

```bash
ssh amloh@192.168.1.8 'docker service ls --format "{{.Name}} {{.Image}} {{.Replicas}}"'
# buildairesume-app-vmvp35            1/1
# buildairesume-worker-daemon         0/0     ← stopped, still defined
# <new worker service>                1/1
```

**Let it soak before deleting anything.** Leave the old service at `0/0` across at least one real
application submission and one full deploy cycle. Once you are satisfied, remove it as housekeeping:

```bash
ssh amloh@192.168.1.8 'docker service rm buildairesume-worker-daemon'
```

There is no need to rush that last command — a stopped service costs nothing, and keeping it is free
insurance until you have seen the new worker survive a deploy.

---

## Step 5 — Point the admin panel at the new worker

On the **app** (`resumebuiler`), not the new worker app, set:

```
WORKER_HEALTH_URL=http://<new worker service name>:8791
```

Redeploy the app for it to take effect. This is the first time the panel's `workerLoop` section will
populate — it is `configured: false` today because the variable has never been set on either service.

---

## Step 6 — Confirm in the panel

Admin → VPS Setup → **Background Worker**. You should now see:

- **Running**
- `Role: worker`
- **`Commit: <sha>`** ← new
- `Uptime`, `Memory`
- **no** `Stale image` chip

The `Stale image` chip appears only when the worker's commit differs from the web container's. To prove the
check works, force the drift: deploy only the app, and the chip should appear until the worker also
redeploys. With Auto Deploy on, both should move together and the chip should never appear.

Then clean up both secret-bearing files once you no longer need the rollback:

```bash
shred -u ~/worker-env.txt ~/worker-daemon-spec.json 2>/dev/null || rm -P ~/worker-env.txt ~/worker-daemon-spec.json
```

---

## What changes on future deploys

**Before:** every deploy silently left the worker on the previous image, and the only fix was a manual
`docker service update --force`. Nothing in the pipeline enforced it, and the panel could not show it —
that is SB-01b.

**After:** the worker is a managed Dokploy application. `git push` → both tiers rebuild and redeploy
together. The panel shows the worker's commit, so drift is visible if it ever happens again.

**Still true, and worth keeping:** the ingestion microservice (`buildairesume-job-ingestion`) is still
outside Dokploy on host ports. That is Phase 2 — see the plan §7. Its `INGESTION_SERVICE_URL` /
`INGESTION_WORKER_URL` values must stay `172.17.0.1`-based unless that service also moves, and if it does
move, **both** variables must be updated on **both** the app and the worker or the panel's ingestion
section goes dark (plan §11.4).

---

## If something goes wrong

| Symptom | Cause | Fix |
| --- | --- | --- |
| Build runs `next build` | `dockerBuildStage` not set to `worker` | Fix it and rebuild — this is the only setting that matters |
| `/health` returns `role: all` | `WORKER_ROLE` unset and the image is the *web* one | You are running the old image; check the build stage |
| No loops enabled | `WORKER_ROLE=web` was set | Remove it. Never set it on a worker |
| `workerLoop` still `configured: false` | `WORKER_HEALTH_URL` wrong, or the app was not redeployed | Step 5; verify the service name resolves from inside the app container |
| Panel ingestion section goes dark | `INGESTION_*` values were changed | Restore `172.17.0.1`, not `10.0.1.1` |
| Worker drains nothing | It is running, but the queue is empty | Normal. Submit one application and watch |
