# Migrate MongoDB from Atlas to self-hosted MongoDB on the VPS

**Date:** 2026-09-25
**Status:** ✅ EXECUTED 2026-09-25 — cutover complete and verified (evidence in §12 Execution record). The commands below are what **actually ran**; deviations from the original plan are folded in and called out.
**Related:** `docs/mongodb-split-database-recovery.md` (recovery ran **against the local replica set after the restore** — Atlas was already write-blocked, see §4), `docs/application-automation/vps-worker-fixes.md` (overlapping V-tasks).

---

## 1. Why (measured, not guessed)

Measured against the live Atlas cluster (read-only `collStats`, 2026-09-25):

| What | Size |
|---|---|
| `airesume.jobs` (30,103 docs) | **218.6 MB docs + 111.0 MB indexes = 329.5 MB** |
| `airesume` totals | ~123 MB compressed storage, **~415 MB logical data+indexes** (72 collections) |
| `airesume.uksponsors` (125k docs) | 34.8 MB |
| `airesume.jobEvents` (27.6k docs) | 18.1 MB (telemetry — candidate for TTL expiry either way) |
| `test` (split-brain db, 4,206 jobs etc.) | tens of MB |

Atlas M0 caps at **512 MB** → logical data+indexes measured **~415 MB ≈ 80% of the cap** (the Atlas UI may show a lower compression-adjusted number; either way we are well over half and `jobs` alone is ~80% of the dataset). `jobs` grows with every ingestion cycle. Self-hosting on the VPS removes the cap (disk becomes the only limit), removes cross-internet latency (app ↔ DB over the private Docker network), and removes Atlas's connection/data-transfer rate limits.

**What you take on in exchange** (accepted consciously): backups become self-managed (Phase 5 automates them), the VPS becomes a single point of failure, and you own upgrades/monitoring. Atlas stays alive and untouched as the rollback target until the rollback window closes.

### Constraints found in the codebase (these shape the plan)

1. **Transactions are used** (`src/lib/utils/db-transaction.ts` → `cv-repository`, `jobs/[id]`, Polar webhooks). The helper degrades gracefully on standalone, **but payment/CV atomicity must not silently degrade** → run a **single-node replica set** (`rs0`), not a plain standalone.
2. **`$text` search is standard MongoDB** (not Atlas Search) → works self-hosted unchanged.
3. **No Atlas-only APIs** anywhere (`cloud.mongodb.com` was referenced only by the admin health page — fixed in this commit; `mongodb+srv` URI handling in `connection-manager` already supports plain `mongodb://` via its `tls:false` branch).
4. **Atlas server is `8.0.32`** → the original plan pinned the image to the same 8.0.x line. **As executed:** the VPS kernel (≥6.19) is hard-blocked from running `mongo:8.0.32` (SERVER-121912 — the image refuses to start), so the deployed image is **`mongo:8.2.12`** (8.2 line verified working on this box). The 8.0-era data restores cleanly; mongodump/restore are version-agnostic either way.
5. The split-database guard from `docs/mongodb-split-database-recovery.md` keeps working unchanged: keep `MONGODB_DB=airesume` set after the move.

---

## 2. Phase 0 — preflight (run on the VPS)

```bash
df -h                              # free disk: need data + indexes (~0.5 GB) + 7 nightlies + growth
free -m                            # RAM for the wiredTiger cache sizing below
docker --version && docker compose version
docker network ls | grep -i dokploy     # note the exact network name (default: dokploy-network)
ss -tlnp | grep 27017 || echo "27017 free"
lsb_release -cs                    # Ubuntu codename for the tools repo (Phase 2)
```

Then in the **Dokploy UI**, list every service that defines `MONGODB_URI` / `MONGODB_DB` / `MONGODB_DATABASE` (web app, job-ingestion worker, LinkedIn worker, application worker, cron services). Those are all flipped in Phase 3. While there, confirm `MONGODB_DB=airesume` is set today (evidence says prod reads `airesume`, but verify rather than assume — rule 61.18).

**Pre-migration data fix — as executed:** Atlas was already write-blocked (M0 quota full, 512/512 MB), so `--apply` against Atlas can no longer write (it fails cleanly with a quota error — zero writes). The recovery therefore ran **against the local replica set after the Phase 2 restore** (the dump came from the frozen cluster, so local ≡ Atlas):

```bash
ssh -f -N -L 27017:127.0.0.1:27017 <vps>          # tunnel: local 27017 → VPS loopback
# temporarily point .env.local at the path-less local URI:
#   MONGODB_URI=mongodb://buildai:<pw>@127.0.0.1:27017/?directConnection=true
#   MONGODB_DB=airesume
node scripts/recover-split-db-documents.mjs --apply --with-history
# restore .env.local from backup, kill the tunnel
```

Result: all 9 planned docs landed (8 copied; the referenced `jobs` doc was **already present** in `airesume` under its canonical `_id` — the unique `canonicalId` index correctly refused the duplicate — so `jobapplications.jobId` + the 3 `applicationevents` were re-pointed at the existing canonical job `6a8ef7b2…`; original ids are preserved in the script's backup JSON). Post-checks: 0 dangling references, docs page shows the master CV.

RAM → wiredTiger cache (`--wiredTigerCacheSizeGB`, passed as `1` below): 2 GB RAM → `0.5`, 4 GB → `1`, 8 GB → `2`. The default (50% of RAM) is too greedy for a box that also runs Next.js + workers.

---

## 3. Phase 1 — deploy MongoDB (one-time, no app impact yet)

The stack lives in **`/home/amloh/mongodb/`** on the VPS (the operator session has **no sudo** — nothing under `/opt`, no apt; every tool below is user-space):

### `/home/amloh/mongodb/.env` (chmod 600)

```bash
MONGO_INITDB_ROOT_USERNAME=root
MONGO_INITDB_ROOT_PASSWORD='<generate: openssl rand -hex 24>'
APP_DB_PASSWORD='<generate: openssl rand -hex 24>'
```

> Use **hex**, not `base64` — base64 output can contain `/` and `+`, which are not safe inside a `mongodb://` connection string.
>
> ⚠ The image only honours **`MONGO_INITDB_ROOT_USERNAME` / `MONGO_INITDB_ROOT_PASSWORD`** — a variable named `MONGO_ROOT_PASSWORD` is ignored (this was wrong in the original draft).

### `/home/amloh/mongodb/docker-compose.yml`

```yaml
name: mongodb

services:
  mongodb:
    image: mongo:8.2.12        # NOT 8.0.32: kernel ≥6.19 hard-blocks ≤8.0.32 (SERVER-121912)
    container_name: mongodb
    restart: unless-stopped
    command:
      - mongod
      - --replSet
      - rs0
      - --bind_ip_all
      - --auth
      - --keyFile               # REQUIRED: auth + --replSet needs a keyfile (8.x refuses to start without it)
      - /etc/mongo-keyfile
      - --wiredTigerCacheSizeGB
      - "0.5"                   # size per Phase 0 RAM table
    env_file: .env
    volumes:
      - mongo-data:/data/db
      - mongo-config:/data/configdb
      - ./keyfile:/etc/mongo-keyfile:ro
    ports:
      - "127.0.0.1:27017:27017"   # LOOPBACK ONLY — host tooling; never 0.0.0.0, never in UFW
    networks:
      - dokploy-network
    healthcheck:
      test: ["CMD", "mongosh", "--quiet", "--eval", "db.adminCommand('ping').ok"]
      interval: 10s
      timeout: 5s
      retries: 12

volumes:
  mongo-data:
  mongo-config:

networks:
  dokploy-network:
    external: true    # change if Phase 0 found a different name
```

Generate the keyfile **without host sudo** (the container's `mongod` runs as uid 999; a host-created file would be root-owned and unreadable):

```bash
cd /home/amloh/mongodb
umask 077
openssl rand -base64 756 > keyfile
docker run --rm -v "$PWD":/w --entrypoint chown mongo:8.2.12 999:999 /w/keyfile   # no host sudo needed
ls -l keyfile   # must show 999:999 mode 400 (mounted read-only at /etc/mongo-keyfile)
```

> **Never** publish `27017` on `0.0.0.0`. Docker bypasses UFW for published ports, so the `127.0.0.1:` binding is the actual control (UFW stays closed too — V6.x task).

### Start + bootstrap (replica set + app user, one time)

```bash
cd /home/amloh/mongodb && docker compose up -d
set -a; . ./.env; set +a     # load MONGO_INITDB_ROOT_PASSWORD / APP_DB_PASSWORD for the commands below
# wait for healthy, then:
docker exec -i mongodb mongosh -u root -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin <<EOF
try {
  rs.initiate({ _id: 'rs0', members: [{ _id: 0, host: 'mongodb:27017' }] });
  print('replica set initiated');
} catch (e) { if (!/already initialized/.test(e.message)) throw e; print(e.message); }
const adm = db.getSiblingDB('admin');
if (!adm.getUser('buildai')) {
  adm.createUser({
    user: 'buildai',
    pwd: '${APP_DB_PASSWORD}',
    roles: [
      { role: 'readWrite', db: 'airesume' },
      { role: 'readWrite', db: 'test' },
    ],
  });
  print('app user created');
} else { print('app user exists'); }
EOF
# confirm PRIMARY (takes a few seconds):
docker exec mongodb mongosh -u root -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --quiet --eval 'rs.status().myState'   # expect: 1
```

Install host-side tools — **as executed**: no sudo, so no apt repo. Pull the official tarball and unpack it under the stack directory (the `mongo` image ships without `mongodump`/`mongorestore`):

```bash
cd /home/amloh/mongodb
curl -fsSL -o /tmp/mdbtools.tgz https://fastdl.mongodb.org/tools/platform/mongodb-database-tools-ubuntu2204-x86_64-100.10.0.tgz
mkdir -p bin && tar -xzf /tmp/mdbtools.tgz --strip-components=2 -C bin mongodb-database-tools-100.10.0/bin
export PATH=/home/amloh/mongodb/bin:$PATH
mongodump --version | head -1        # mongodump version: 100.10.0
```

> The 100.11.1 tarball URL returned **403** — 100.10.0 is what works. Put `export PATH=/home/amloh/mongodb/bin:$PATH` in every script that uses the tools (`restore.sh`, `counts.sh`, `backup.sh` do).

Smoke test (loopback, authenticated, replica-set-direct):

```bash
mongosh "mongodb://buildai:${APP_DB_PASSWORD}@127.0.0.1:27017/?authSource=admin&directConnection=true" --quiet --eval 'db.adminCommand({ping:1}).ok && rs.status().myState'
```

---

## 4. Phase 2 — initial data sync (Atlas → local, **zero downtime**)

App still runs on Atlas during this phase. On the VPS:

```bash
umask 077
mkdir -p /home/amloh/mongodb/backups/precut
# Atlas credentials in a mode-600 file — never on the command line / in history:
cat > /home/amloh/mongodb/.atlas.env <<'EOF'
ATLAS_URI='mongodb+srv://<user>:<pass>@cluster0.ta7jxv7.mongodb.net/?appName=Cluster0'
EOF
chmod 600 /home/amloh/mongodb/.atlas.env
set -a; . /home/amloh/mongodb/.atlas.env; . /home/amloh/mongodb/.env; set +a   # ATLAS_URI + APP_DB_PASSWORD
```

### 4.1 The dump — `mongodump` was unusably slow here; a custom dumper was used instead

**Measured against this Atlas M0** (2026-09-25): sustained single-connection reads ≈ **105 KB/s**; `mongodump` lanes crawled at ~5 KB/s per lane (parallel=2 → 1.8 MB/min, parallel=6 → 4.4 MB/min) — hours for ~43 MB compressed, and interrupted lanes report `received termination signal`. So the dump ran with a small Node script (`dump2.js`, 103 lines, kept next to the stack) using the `mongodb` driver that ships inside the job-ingestion image:

- 6 concurrent workers pulling `find().batchSize(2000)` cursors;
- collections > 12k docs split into **4 `_id`-quartile shards** (`name#0…#3`) that are concatenated and merged afterwards (this is what beat the per-cursor ~100 KB/s ceiling);
- skip-done marker = both `.bson.gz` and `.metadata.json.gz` already present → safe to re-run/resume;
- metadata written as `{"indexes":[…],"options":{}}` — accepted by `mongorestore` (verified by the restore + index logs).

```bash
# run detached (no password on any command line — --env-file only):
docker run -d --name atlas-dump --user 1000:1000 --entrypoint node \
  -v /home/amloh/mongodb:/w --env-file /home/amloh/mongodb/.atlas.env \
  buildairesume-job-ingestion /w/dump2.js
docker logs -f atlas-dump        # watch until: ALL_DONE
```

Result: **133/133 collections**, `backups/precut/` = 43 MB, every `.bson.gz` passes `gzip -t`, zero `.part` leftovers, jobs = 30,103 docs (shards 7,526×3 + 7,525), uksponsors = 125,198, total ≈ **258,030 documents**.

### 4.2 Restore — `--dir` must point at the dump **root**

```bash
cd /home/amloh/mongodb && ./restore.sh
```

⚠ **Gotcha found the hard way:** `mongorestore --dir backups/precut/airesume` (a *per-db* directory) prints `don't know what to do with file "…/activitylogs.bson.gz", skipping...` for every file and **exits 0** — silently restoring nothing. Pass the dump **root** (`--dir backups/precut`, which contains the db subdirectories):

```bash
mongorestore --uri="mongodb://buildai:${APP_DB_PASSWORD}@127.0.0.1:27017/?authSource=admin&directConnection=true" \
  --gzip --dir backups/precut --numParallelCollections=4
# → Restored 258030 documents in 56 seconds; failures: 0 (indexes restored from the metadata files)
```

### 4.3 Verify counts Atlas vs local (must match exactly)

```bash
./counts.sh      # per-collection countDocuments() on both sides → COUNTS_MATCH / COUNTS_DIFFER
```

Expect `COUNTS_MATCH` (it did). Spot-checks: `cvs` **159** after the recovery script (157 + 2), `users` (83), `jobs` (30,103), and `db.getSiblingDB("airesume").jobs.getIndexes()` equal to Atlas's.

---

## 5. Phase 3 — cutover (short maintenance window)

**As executed — no final resync was needed:** Atlas was already write-blocked (quota) before the dump, so the single Phase 2 dump *is* the final state; `counts.sh` was re-run as the pre-flip guard (the only delta: the +8 recovery docs — every other collection identical, zero Atlas drift).

Everything below is scripted in **`/home/amloh/mongodb/cutover.sh`** (chmod 700):

1. **Pre-flip sanity** (read-only — run *before* stopping anything so a failure costs no downtime): local counts of `users`/`cvs`/`jobapplications`/`jobs`.
2. **Stop all writers:**
   ```bash
   docker service scale buildairesume-app-vmvp35=0
   docker service scale buildairesume-worker-daemon=0
   docker stop buildairesume-job-ingestion     # restart:unless-stopped stays down
   sleep 5
   ```
3. **Flip env** — as executed, via the Docker CLI rather than the Dokploy UI (Dokploy holds no `MONGODB_*` entries for these services, so nothing reverts them; verified after the flip that each service spec contains exactly **one** `MONGODB_URI`):
   ```bash
   docker service update --env-add "MONGODB_URI=$LOCAL_URI" buildairesume-app-vmvp35
   docker service update --env-add "MONGODB_URI=$LOCAL_URI" buildairesume-worker-daemon
   # job-ingestion is compose-managed:
   #   .env →  MONGODB_URI=$LOCAL_URI   (MONGODB_DATABASE=airesume unchanged)
   #   docker-compose.yml → attach to the external dokploy-network (service networks: [default, dokploy-network] + top-level external network)
   docker compose -f /opt/cvcircle-build/buildairesume-job-ingestion/docker-compose.yml \
     --project-directory /opt/cvcircle-build/buildairesume-job-ingestion up -d
   ```
   with:

   ```
   MONGODB_URI=mongodb://buildai:<APP_DB_PASSWORD>@mongodb:27017/airesume?authSource=admin&replicaSet=rs0&appName=buildairesume
   MONGODB_DB=airesume
   ```

   ⚠ When `sed`-ing that URI into a file, escape `&` (`\&`) — otherwise sed expands it to the whole match and corrupts the URI.

   The db is in the URI path **and** in `MONGODB_DB` — deliberate belt-and-braces after the split-database incident. Services using `MONGODB_DATABASE`: keep `MONGODB_DATABASE=airesume`. The app connects over the Docker network as hostname `mongodb` (if any service runs on another network: `docker network connect dokploy-network mongodb`).
4. **Restart** writers (`docker service scale …=1` for app + worker; compose `up -d` already restarted job-ingestion).
5. **Verify (Phase 4).**

---

## 6. Phase 4 — verification checklist

Executed 2026-09-25 (evidence in §12):

- [x] `docker exec mongodb mongosh -u root -p ... --eval 'rs.status().myState'` → `1`
- [x] App logs: no `Split-database guard` errors, no auth failures, no `server selection` timeouts (grep over post-cutover logs → clean)
- [x] Endpoints: `/` 200, `/api/auth/session` 200, `/api/jobs` + `/api/search` 401 (auth wall, not 500), public site `https://resume.morigrid.com` renders fully incl. DB-backed sections
- [x] Env inspection: each swarm service holds **exactly one** `MONGODB_URI` pointing at `mongodb:27017`; zero `mongodb+srv`/`cluster0` remnants in any service env or the ingestion `.env`
- [x] Live traffic: ~50 client connections against the local mongod; `opcounters.update` growing across a 75 s window (services both read **and** write local)
- [x] Ingestion worker logs: `✅ Successfully connected to MongoDB [airesume]` + `✅ All MongoDB indexes verified successfully`
- [ ] **User check (needs a login session):** docs page lists the master CV, save a CV (template switch), jobs feed + one job detail page, Admin → System Health (`database: healthy`, no phantom "MongoDB Atlas" row)
- [ ] Local `jobs` count climbing as ingestion cycles run (cadence-dependent; Atlas stays frozen so divergence in this direction is expected and correct)
- [x] `df -h` sane (77 %, 24 G free); backup script (Phase 5) runs green

---

## 7. Phase 5 — backups (new responsibility — Atlas used to do this for you)

### `/home/amloh/mongodb/backup.sh` (chmod 700) — as executed

```bash
#!/usr/bin/env bash
# Nightly MongoDB backup: local rotated dumps + offsite push (if an rclone "r2" remote is configured).
set -euo pipefail
umask 077
cd /home/amloh/mongodb
set -a; . ./.env; set +a
export PATH=/home/amloh/mongodb/bin:$PATH     # tools live in the user-space tarball (no sudo/apt here)
BK=/home/amloh/mongodb/backups/daily
mkdir -p "$BK"
STAMP=$(date +%Y%m%d-%H%M%S)

# Health first — never back up a broken deployment silently:
# (no mongosh on the host — the image has it, so health check through the container)
STATE=$(docker exec mongodb mongosh -u root -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin \
        --quiet --eval 'try{rs.status().myState}catch(e){-1}')
[ "$STATE" = "1" ] || { echo "FATAL: replica set state=$STATE (expected 1)"; exit 1; }

mongodump --uri="mongodb://buildai:${APP_DB_PASSWORD}@127.0.0.1:27017/?authSource=admin&directConnection=true" \
  --gzip --out "$BK/dump-$STAMP" --numParallelCollections=4

# retention: keep last 7 nightlies
ls -1dt "$BK"/dump-* 2>/dev/null | tail -n +8 | xargs -r rm -rf

# disk guard: warn if the volume is >85% full
df -PM /home/amloh/mongodb | awk 'NR==2 && $5+0 > 85 {print "WARN: disk " $5 " full"}'

# offsite push (rclone remote "r2"); skip gracefully if not configured
if command -v rclone >/dev/null 2>&1 && rclone listremotes 2>/dev/null | grep -q '^r2:'; then
  rclone sync "$BK" r2:buildairesume-backups/mongodb-daily --transfers 4
fi
echo "backup ok: dump-$STAMP"
```

Installed in the user crontab (no sudo needed; log lands next to the backups):

```bash
crontab -l | { grep -v 'mongodb/backup.sh'; cat; echo '17 3 * * * /home/amloh/mongodb/backup.sh >> /home/amloh/mongodb/backups/backup.log 2>&1'; } | crontab -
```

**Test run (2026-09-25): green** — 43 MB, 133/133 collections, all `gzip -t` clean, full dump in ~1 min locally (local mongodump is *fast*; only the Atlas side was the bottleneck).

**Offsite push — still pending (needs a decision/credentials):** `rclone` is already installed, but the only configured remote is a personal `gdrive:`; the app's `AWS_*`/`S3_BASE_URL` env is a stale `cvcircle` bucket on AWS S3 (`NoSuchBucket`) — not usable. Configure a `r2` remote with real R2 keys before relying on offsite (one-time):

```bash
rclone config   # remote "r2" → s3 → provider Cloudflare R2 →
                # endpoint https://<ACCOUNT_ID>.r2.cloudflarestorage.com →
                # access key id / secret from R2 API → region "auto" → leave root blank
rclone lsd r2:  # verify
```

> ⚠ Do **not** point backups at a bucket/object-URL that serves files publicly — dumps contain candidate PII. Use a private bucket (or confirm listing+access require keys) and an unguessable prefix.

Restore drill (do this **once** after go-live, per rule 62): restore the nightlies dump into a scratch container and diff counts — a backup that has never been restored is not a backup. (The Phase 2 `backups/precut` dump *was* fully restore-verified — 258,030 docs, 0 failures, indexes present — but the nightly path itself still needs its own drill.)

---

## 8. Rollback

**During the cutover window (step 3–5 not yet done):** nothing to undo locally — leave app stopped or flip `MONGODB_URI` back to the Atlas value and restart. Atlas is untouched → clean rollback, zero data loss.

**After go-live:** Atlas is frozen at cutover time; rolling back means moving writes back:

1. Stop all writers (same as cutover step 2).
2. Dump the **local** DB (`mongodump --uri="mongodb://buildai:${APP_DB_PASSWORD}@127.0.0.1:27017/?authSource=admin&directConnection=true" --gzip --out /home/amloh/mongodb/backups/rollback`).
3. Restore into **Atlas** with `mongorestore --uri="$ATLAS_URI" --gzip --drop --dir .../airesume` (and `/test`).
   ⚠ **Blocked while the quota is full:** Atlas refused *all* writes during the migration (that is what froze it). Rollback to Atlas first requires freeing/upgrading the M0 (delete the stale cluster data or raise the tier), otherwise the restore fails exactly like the recovery script did.
   ⚠ This replaces the Atlas contents — re-verify counts first, and know that anything written to Atlas between cutover and rollback (there should be nothing — writers point only at local) is irrelevant.
4. Flip env back to `MONGODB_URI=mongodb+srv://...` (each of the three services) + restart, and re-run verification.

**Keep the Atlas cluster alive (M0 may be paused only after the rollback window)** — recommend ≥ 2 weeks, then pause/delete and cancel nothing you still need for R2/Stalwart.

---

## 9. Repo changes shipped with this plan

- `src/app/api/admin/system-health/route.ts` — the "MongoDB Atlas" third-party ping now only appears when `MONGODB_URI` is actually an Atlas URI; after cutover the admin health page shows the DB check (already real) without a phantom Atlas outage.
- `buildairesume-job-ingestion/docker-compose.yml` — service now joins the external `dokploy-network` (mirrors the live edit made during cutover) so the container resolves the `mongodb` hostname.
- Everything else needs **no code change**: `connection-manager` already accepts plain `mongodb://` (`tls:false` branch), `MONGODB_DB` keeps the split-database guard active, `$text` search is standard, and `db-transaction.ts` gets real transactions from the replica set instead of its standalone fallback.

## 10. Explicitly NOT changing

- **Database engine stays MongoDB** (no PostgreSQL — rule 61.2 is about engine migrations; this is only hosting).
- R2 for files, Stalwart for email, Dokploy/Cloudflare for deploy/edge — untouched.
- Local dev `.env.local` keeps pointing at Atlas initially (dev writes are tiny and stay inside the rollback story). Optional follow-up: a laptop Docker Mongo + `mongorestore` of a sanitized dump; not needed for this migration.
- The `test` split-brain database migrates along (it's small) — schedule its cleanup separately after go-live.

## 11. Follow-ups

- [ ] **Offsite backup push** — configure the rclone `r2` remote (§7) with real R2 keys; local 7-day rotation runs nightly at 03:17 already.
- [ ] **Restore-drill the nightly backup** once (§7) and record the result.
- [ ] **User verification pass with a real login:** docs page master CV, CV save + template switch, jobs feed + job detail, Admin → System Health (Phase 4 unchecked boxes).
- [ ] Watch the first ingestion cycle land in the local DB (`airesume.jobs` climbs above 30,103).
- [ ] Phase 0 V-tasks overlap (V6 UFW, V10 resources) — the same SSH session covers both; see `docs/application-automation/vps-worker-fixes.md`.
- [ ] Add `jobEvents` / `activitylogs` TTL indexes (they are 19 MB+ of pure telemetry and grow forever).
- [ ] Update any deployment docs that still show an Atlas `MONGODB_URI` example.
- [ ] ≥ 2 weeks after go-live: decide Atlas fate (pause/delete — but only after the rollback window *and* once rollback is no longer needed).

---

## 12. Execution record (2026-09-25)

**Outcome: cutover complete, app + workers + ingestion all read/write the local MongoDB; nothing broken.**

What ran, in order:

1. **Phase 0/1** — preflight; `mongo:8.0.32` refused to start on this kernel (SERVER-121912) → deployed **`mongo:8.2.12`** with keyFile (`999:999`, mode 400, mounted ro) + `rs0` at `mongodb:27017` + `buildai` user; tools via user tarball (**100.10.0** — 100.11.1 URL 403s) in `/home/amloh/mongodb/bin`.
2. **Pre-cutover compat test → `COMPAT_OK`**: the app container's own mongoose 8.24.4 connected via `replicaSet=rs0` over `dokploy-network`, `isWritablePrimary=true`, wire version 27, a real transaction committed, counts readable.
3. **Atlas creds** transferred as a file (mode 600, `.atlas.env`) — never echoed into any transcript.
4. **Dump** — after `mongodump` proved unusable against Atlas (measured 1.8–4.4 MB/min), custom `dump2.js` ran detached in the job-ingestion image: **133/133 collections, 43 MB, 258,030 docs**, jobs 30,103 (shards 7,526×3 + 7,525), all `gzip -t` clean, zero `.part` files. (One operator mistake along the way: a too-broad "mystery file" cleanup deleted the in-progress `*.bson.gz` files — the dumper's skip-done markers made a clean full re-dump cheap.)
5. **Restore** — first attempt with per-db `--dir` silently skipped everything (exit 0; §4.2 gotcha) → rerun against the dump root: **258,030 docs, 0 failures, 56 s**, indexes restored from the custom metadata format.
6. **`counts.sh` → `COUNTS_MATCH`** (every collection, both dbs, Atlas vs local).
7. **Recovery on local** (tunnelled; `.env.local` swapped and restored) — 9/9 planned docs verified; the `jobs` doc was already present under its canonical `_id` (unique `canonicalId`), so the application's + 3 events' `jobId` were re-pointed at `6a8ef7b2…`; **0 dangling references** afterwards. Re-run of `counts.sh` showed exactly the **+8** explained delta and nothing else.
8. **Cutover via `cutover.sh`** — sanity → stop writers → `docker service update --env-add` (app + worker) + job-ingestion `.env`/compose flip → restart → **app 200 / ingestion 200**; ingestion logged `Successfully connected to MongoDB [airesume]` + index verification; grep for mongo/auth/timeout errors clean.
9. **Post-flip proof** — exactly one `MONGODB_URI` per service, all pointing at `mongodb:27017`, zero `mongodb+srv`/`cluster0` remnants anywhere; ~50 live connections on the local mongod; `opcounters.update` growing over a 75 s window; public `https://resume.morigrid.com` renders end-to-end.
10. **Phase 5** — `backup.sh` test green (43 MB, 133/133, gzip clean) + nightly cron at **03:17** installed; offsite `r2` push still pending credentials (§7).

Deviations from the original plan (all folded into the sections above): image `mongo:8.2.12` (not 8.0.32), stack at `/home/amloh/mongodb` (not `/opt`, no sudo), `MONGO_INITDB_ROOT_PASSWORD` (not `MONGO_ROOT_PASSWORD`), keyFile required, tools via tarball (not apt), custom dumper (not `mongodump`) for the Atlas side, recovery ran post-restore against local (Atlas write-blocked), no cutover-window resync (Atlas frozen), env flip via `docker service update --env-add` (not the Dokploy UI).
