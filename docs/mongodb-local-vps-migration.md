# Migrate MongoDB from Atlas to self-hosted MongoDB on the VPS

**Date:** 2026-09-25
**Status:** plan — all commands are run by the operator (this repo never touches the VPS itself).
**Related:** `docs/mongodb-split-database-recovery.md` (run the recovery script **before** the final dump), `docs/application-automation/vps-worker-fixes.md` (overlapping V-tasks).

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
4. **Atlas server is `8.0.32`** → pin the Docker image to the same 8.0.x line (mongodump/restore are version-agnostic either way).
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

**Pre-migration data fix:** run the split-database recovery script against Atlas *before* the final dump so the recovered CV/application come along:

```bash
node scripts/recover-split-db-documents.mjs --apply --with-history
```

RAM → wiredTiger cache (`--wiredTigerCacheSizeGB`, passed as `1` below): 2 GB RAM → `0.5`, 4 GB → `1`, 8 GB → `2`. The default (50% of RAM) is too greedy for a box that also runs Next.js + workers.

---

## 3. Phase 1 — deploy MongoDB (one-time, no app impact yet)

Create `/opt/mongodb/` on the VPS:

### `/opt/mongodb/.env` (chmod 600)

```bash
MONGO_INITDB_ROOT_USERNAME=root
MONGO_ROOT_PASSWORD='<generate: openssl rand -hex 24>'
APP_DB_PASSWORD='<generate: openssl rand -hex 24>'
```

> Use **hex**, not `base64` — base64 output can contain `/` and `+`, which are not safe inside a `mongodb://` connection string.

### `/opt/mongodb/docker-compose.yml`

```yaml
name: mongodb

services:
  mongodb:
    image: mongo:8.0.32        # matches Atlas server 8.0.32 — verify with: docker pull mongo:8.0.32
    container_name: mongodb
    restart: unless-stopped
    command:
      - mongod
      - --replSet
      - rs0
      - --bind_ip_all
      - --auth
      - --wiredTigerCacheSizeGB
      - "1"                    # size per Phase 0 RAM table
    env_file: .env
    volumes:
      - mongo-data:/data/db
      - mongo-config:/data/configdb
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

> **Never** publish `27017` on `0.0.0.0`. Docker bypasses UFW for published ports, so the `127.0.0.1:` binding is the actual control (UFW stays closed too — V6.x task).

### Start + bootstrap (replica set + app user, one time)

```bash
cd /opt/mongodb && docker compose up -d
set -a; . ./.env; set +a     # load MONGO_ROOT_PASSWORD / APP_DB_PASSWORD for the commands below
# wait for healthy, then:
docker exec -i mongodb mongosh -u root -p "$MONGO_ROOT_PASSWORD" --authenticationDatabase admin <<EOF
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
docker exec mongodb mongosh -u root -p "$MONGO_ROOT_PASSWORD" --authenticationDatabase admin --quiet --eval 'rs.status().myState'   # expect: 1
```

Install host-side tools (the `mongo` image ships **without** `mongodump`/`mongorestore`):

```bash
curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-8.0.gpg
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/8.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list
sudo apt-get update && sudo apt-get install -y mongodb-database-tools
mongodump --version | head -1
```

Smoke test (loopback, authenticated, replica-set-direct):

```bash
mongosh "mongodb://buildai:${APP_DB_PASSWORD}@127.0.0.1:27017/?authSource=admin&directConnection=true" --quiet --eval 'db.adminCommand({ping:1}).ok && rs.status().myState'
```

---

## 4. Phase 2 — initial data sync (Atlas → local, **zero downtime**)

App still runs on Atlas during this phase. On the VPS:

```bash
umask 077
mkdir -p /opt/mongodb/backups/precut
# Atlas credentials in a root-only file — never on the command line / in history:
cat > /opt/mongodb/.atlas.env <<'EOF'
ATLAS_URI='mongodb+srv://<user>:<pass>@cluster0.ta7jxv7.mongodb.net/?appName=Cluster0'
EOF
chmod 600 /opt/mongodb/.atlas.env
set -a; . /opt/mongodb/.atlas.env; . /opt/mongodb/.env; set +a   # ATLAS_URI + APP_DB_PASSWORD

# 1. Full dump of both databases (airesume + test), gzip
mongodump --uri="$ATLAS_URI" --out=/opt/mongodb/backups/precut --gzip

# 2. Restore into the local replica set (direct connection; drop nothing — fresh volume)
mongorestore --host 127.0.0.1:27017 \
  --username buildai --password "$APP_DB_PASSWORD" --authenticationDatabase admin \
  --gzip --numInsertionWorkersPerCollection=4 \
  --dir /opt/mongodb/backups/precut/airesume
mongorestore --host 127.0.0.1:27017 \
  --username buildai --password "$APP_DB_PASSWORD" --authenticationDatabase admin \
  --gzip --numInsertionWorkersPerCollection=4 \
  --dir /opt/mongodb/backups/precut/test
```

### Verify counts Atlas vs local (must match exactly)

```bash
COUNT_JS='for (const d of ["airesume","test"]) { const x = db.getSiblingDB(d); for (const c of x.getCollectionNames().sort()) { const n = x.getCollection(c).countDocuments(); if (n > 0) print(d + "." + c + "=" + n); } }'

mongosh "$ATLAS_URI" --quiet --eval "$COUNT_JS" | sort > /tmp/atlas.counts
mongosh "mongodb://buildai:${APP_DB_PASSWORD}@127.0.0.1:27017/?authSource=admin&directConnection=true" --quiet --eval "$COUNT_JS" | sort > /tmp/local.counts
diff /tmp/atlas.counts /tmp/local.counts && echo "COUNTS MATCH" || echo "MISMATCH — investigate before cutover"
```

Also spot-check: `cvs` (expect 158 after the recovery script), `users` (83), `jobs` (30,103), and indexes: `mongosh local --eval 'db.getSiblingDB("airesume").jobs.getIndexes().length'` must equal the Atlas value.

---

## 5. Phase 3 — cutover (short maintenance window)

Atlas keeps receiving writes until step 3; the local copy is refreshed one final time while writes are stopped.

1. **Run the recovery script** (`--apply --with-history`) if not done in Phase 0.
2. **Stop all writers** (Dokploy): scale the web app to 0 **and** stop the job-ingestion / LinkedIn / application / cron services. Confirm no containers hold writes:
   ```bash
   docker ps --format '{{.Names}}' | grep -Ei 'worker|ingestion|next|app'   # stop each via Dokploy UI
   ```
3. **Final sync** (app stopped → dump is consistent; no oplog needed):
   ```bash
   set -a; . /opt/mongodb/.atlas.env; . /opt/mongodb/.env; set +a
   rm -rf /opt/mongodb/backups/final && mkdir -p /opt/mongodb/backups/final
   mongodump --uri="$ATLAS_URI" --out=/opt/mongodb/backups/final --gzip
   mongorestore --host 127.0.0.1:27017 \
     --username buildai --password "$APP_DB_PASSWORD" --authenticationDatabase admin \
     --gzip --drop --numInsertionWorkersPerCollection=4 --dir /opt/mongodb/backups/final/airesume
   mongorestore --host 127.0.0.1:27017 \
     --username buildai --password "$APP_DB_PASSWORD" --authenticationDatabase admin \
     --gzip --drop --numInsertionWorkersPerCollection=4 --dir /opt/mongodb/backups/final/test
   ```
   (`--drop` applies to the **local** databases only — Atlas is never a target here.)
4. **Flip env vars in Dokploy — for every service found in Phase 0:**

   ```
   MONGODB_URI=mongodb://buildai:<APP_DB_PASSWORD>@mongodb:27017/airesume?authSource=admin&replicaSet=rs0&appName=buildairesume
   MONGODB_DB=airesume
   ```

   The db is in the URI path **and** in `MONGODB_DB` — deliberate belt-and-braces after the split-database incident. Worker services that use `MONGODB_DATABASE` instead: set `MONGODB_DATABASE=airesume`. The app connects over the Docker network as hostname `mongodb` — no host/port changes needed if the services share `dokploy-network` (if any service runs on another network: `docker network connect dokploy-network mongodb`).
5. **Restart** web app + workers + cron.
6. **Verify (Phase 4).**

---

## 6. Phase 4 — verification checklist

- [ ] `docker exec mongodb mongosh -u root -p ... --eval 'rs.status().myState'` → `1`
- [ ] App logs: no `Split-database guard` errors, no auth failures, no `server selection` timeouts
- [ ] Site: login works, **docs page lists the master CV**, save a CV (template switch included), jobs feed loads, one job detail page opens
- [ ] Admin → System Health: `database: healthy` and the "MongoDB Atlas" row is **gone** (repo change in this commit), Stripe/Polar rows still present
- [ ] Local counts are **≥ the cutover snapshot** and growing while Atlas stays frozen (e.g. `jobs` climbs as ingestion resumes) — divergence in this direction is expected and correct
- [ ] Ingestion worker ingests new jobs into the local DB (`db.getSiblingDB("airesume").jobs.count()` grows)
- [ ] `df -h` trending sane; backup script (Phase 5) runs green

---

## 7. Phase 5 — backups (new responsibility — Atlas used to do this for you)

### `/opt/mongodb/backup.sh` (chmod 700)

```bash
#!/usr/bin/env bash
# Nightly MongoDB backup: local rotated dumps + offsite push to Cloudflare R2.
set -euo pipefail
umask 077
cd /opt/mongodb
set -a; . ./.env; set +a
BK=/opt/mongodb/backups/daily
mkdir -p "$BK"
STAMP=$(date +%Y%m%d-%H%M%S)

# Health first — never back up a broken deployment silently:
STATE=$(mongosh "mongodb://buildai:${APP_DB_PASSWORD}@127.0.0.1:27017/?authSource=admin&directConnection=true" --quiet --eval 'rs.status().myState')
[ "$STATE" = "1" ] || { echo "FATAL: replica set state=$STATE (expected 1)"; exit 1; }

mongodump --host 127.0.0.1:27017 \
  --username buildai --password "$APP_DB_PASSWORD" --authenticationDatabase admin \
  --gzip --out "$BK/dump-$STAMP"

# retention: keep last 7 nightlies
ls -1dt "$BK"/dump-* 2>/dev/null | tail -n +8 | xargs -r rm -rf

# disk guard: warn (non-zero but non-fatal) if backups or the data volume are huge
df -PM /opt/mongodb | awk 'NR==2 && $5+0 > 85 {print "WARN: disk " $5 " full"}'

# offsite push (rclone remote "r2", configured once — see below); skip gracefully if absent
if command -v rclone >/dev/null 2>&1 && rclone listremotes 2>/dev/null | grep -q '^r2:'; then
  rclone sync "$BK" r2:buildairesume-backups/mongodb-daily --transfers 4
fi
echo "backup ok: dump-$STAMP"
```

```bash
crontab -e
# 03:17 daily (off-peak; ingestion cron load is irrelevant at this size)
17 3 * * * /opt/mongodb/backup.sh >> /var/log/mongodb-backup.log 2>&1
```

**One-time rclone → R2 config** (reuse your existing R2 bucket/credentials, new prefix):

```bash
sudo apt-get install -y rclone
rclone config   # type n → remote "r2" → s3 → S3 provider Cloudflare R2 →
                # endpoint https://<ACCOUNT_ID>.r2.cloudflarestorage.com →
                # access key id / secret from R2 API → region "auto" → leave root blank
rclone lsd r2:   # verify
```

Restore drill (do this **once** after go-live, per rule 62): restore the nightlies dump into a scratch container and diff counts — a backup that has never been restored is not a backup.

---

## 8. Rollback

**During the cutover window (step 3–5 not yet done):** nothing to undo locally — leave app stopped or flip `MONGODB_URI` back to the Atlas value and restart. Atlas is untouched → clean rollback, zero data loss.

**After go-live:** Atlas is frozen at cutover time; rolling back means moving writes back:

1. Stop all writers (same as cutover step 2).
2. Dump the **local** DB (`mongodump --host 127.0.0.1:27017 ... --out /opt/mongodb/backups/rollback`).
3. Restore into **Atlas** with `mongorestore --uri="$ATLAS_URI" --gzip --drop --dir .../airesume` (and `/test`).
   ⚠ This replaces the Atlas contents — re-verify counts first, and know that anything written to Atlas between cutover and rollback (there should be nothing — writers point only at local) is irrelevant.
4. Flip Dokploy env back to `MONGODB_URI=mongodb+srv://...` + restart, and re-run verification.

**Keep the Atlas cluster alive (M0 may be paused only after the rollback window)** — recommend ≥ 2 weeks, then pause/delete and cancel nothing you still need for R2/Stalwart.

---

## 9. Repo changes shipped with this plan

- `src/app/api/admin/system-health/route.ts` — the "MongoDB Atlas" third-party ping now only appears when `MONGODB_URI` is actually an Atlas URI; after cutover the admin health page shows the DB check (already real) without a phantom Atlas outage.
- Everything else needs **no code change**: `connection-manager` already accepts plain `mongodb://` (`tls:false` branch), `MONGODB_DB` keeps the split-database guard active, `$text` search is standard, and `db-transaction.ts` gets real transactions from the replica set instead of its standalone fallback.

## 10. Explicitly NOT changing

- **Database engine stays MongoDB** (no PostgreSQL — rule 61.2 is about engine migrations; this is only hosting).
- R2 for files, Stalwart for email, Dokploy/Cloudflare for deploy/edge — untouched.
- Local dev `.env.local` keeps pointing at Atlas initially (dev writes are tiny and stay inside the rollback story). Optional follow-up: a laptop Docker Mongo + `mongorestore` of a sanitized dump; not needed for this migration.
- The `test` split-brain database migrates along (it's small) — schedule its cleanup separately after go-live.

## 11. Follow-ups

- [ ] Phase 0 V-tasks overlap (V6 UFW, V10 resources) — the same SSH session covers both; see `docs/application-automation/vps-worker-fixes.md`.
- [ ] Add `jobEvents` / `activitylogs` TTL indexes (they are 19 MB+ of pure telemetry and grow forever).
- [ ] After go-live: restore-drill the backup (Phase 5) and record the result.
- [ ] Update any deployment docs that still show an Atlas `MONGODB_URI` example.
