# BuildAIResume — Infrastructure & Deployment Architecture

This document details the production hosting environment, server infrastructure, container orchestration, database subsystem, mail servers, background workers, and telemetry monitoring for **BuildAIResume** (`buildairesume.com`).

---

## 1. System Topology Overview

```
                         Cloudflare (DNS, Edge SSL, WAF)
                                       │
                                       ▼
                       Production VPS (Ubuntu Linux, UFW)
┌─────────────────────────────────────────────────────────────────────────────┐
│ Dokploy Container Management Engine                                         │
│                                                                             │
│  ┌───────────────────────┐            ┌──────────────────────────────────┐  │
│  │ Web Application       │            │ Job Ingestion Microservice       │  │
│  │ (Next.js 16 App)      │            │ (resumebuilder-worker)           │  │
│  │ Container Port: 3000  │            │ Container Port: 4001             │  │
│  └──────────┬────────────┘            └─────────────────┬────────────────┘  │
│             │                                           │                   │
│             │             Private Docker Network        │                   │
│             │              (morigrid-net / bridge)      │                   │
│             ▼                                           ▼                   │
│  ┌───────────────────────┐            ┌──────────────────────────────────┐  │
│  │ Self-Hosted MongoDB   │            │ Stalwart Mail Server             │  │
│  │ Version 7.0 (NVMe)    │◄───────────┤ SMTP: 587 | JMAP: 8080           │  │
│  │ Local Port: 27017     │            │ IMAP: 993                        │  │
│  └───────────────────────┘            └──────────────────────────────────┘  │
│             ▲                                                               │
│             │ (Atomic Locking)                                              │
│  ┌──────────┴────────────┐                                                  │
│  │ Automation Worker     │                                                  │
│  │ (Playwright Isolated) │                                                  │
│  └───────────────────────┘                                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
                     Cloudflare R2 Object Storage
                     (PDF Resumes, Assets, Cover Letters)
```

---

## 2. Server & Compute Infrastructure

### 2.1 VPS Specifications
- **Operating System**: Ubuntu 22.04 / 24.04 LTS (x86_64)
- **Container Runtime**: Docker Engine 26+ with Docker Compose v2
- **Orchestration**: Dokploy (Web UI management, container deployments, Git webhooks, automated SSL)
- **Firewall (UFW)**: Strict incoming deny-by-default; only ports 80, 443, 22 (SSH via key), and external mail submission ports (25, 465, 587, 993) are accessible from the public internet. Internal service ports (MongoDB `27017`, Ingestion Worker `4001`, internal mail `587`) communicate exclusively over the private Docker network or `127.0.0.1`.

### 2.2 Docker Multi-Stage Image Strategy
The primary application `Dockerfile` (`apps/airesume_app/Dockerfile`) utilizes multi-stage builds to minimize image size and surface area:
- **`deps` stage**: Installs production and peer dependencies with caching.
- **`builder` stage**: Compiles Next.js assets (`next build`) and worker bundlers.
- **`runner` stage (Web)**: Minimal Node.js Alpine base, non-root user (`nextjs:nodejs`), exposing port `3000`. Runs Next.js standalone server.
- **`worker` stage (Background)**: Runs local queue consumers, scheduled task polling, and email dispatchers.

---

## 3. Database Subsystem (MongoDB)

### 3.1 Migration from Cloud to Self-Hosted
Originally hosted on MongoDB Atlas, the primary database was migrated to a dedicated self-hosted MongoDB 7.0 instance running directly on the production VPS.
- **Latency**: Reduced from 45–80ms cross-cloud round-trips to `<1ms` local socket / bridge network latency.
- **Engine**: WiredTiger storage engine configured on local high-speed NVMe storage.
- **Data Persistence**: Mount path mapped to host volume `/var/lib/mongodb` or dedicated Docker volume with proper permissions (`mongodb:mongodb`).
- **Binary Data Policy**: MongoDB stores **metadata and text only**. Binary files (such as generated resume PDFs, cover letter exports, and uploaded documents) are never stored in BSON blobs; they are streamed directly to Cloudflare R2 object storage.

### 3.2 Backup & Disaster Recovery
- **Hourly Dumps**: Automated `mongodump` cron script generates compressed BSON archives locally.
- **Offsite Sync**: Nightly encrypted archives are backed up to secure offsite object storage.
- **Atomic Operations**: All queue operations (`ApplicationQueue`, `NotificationQueue`) use atomic MongoDB `findOneAndUpdate` queries with lease locks (`lockedAt`, `lockedUntil`, `lockedBy`) to prevent race conditions across concurrent processes.

---

## 4. Mail Infrastructure (Stalwart Mail Server)

### 4.1 Deployment Architecture
BuildAIResume utilizes **Stalwart Mail Server**, a modern, high-performance, self-hosted open-source mail server written in Rust, running in a dedicated Docker container.
- **Protocols Supported**:
  - **SMTP / Submission (Port 587)**: Authenticated submission for outgoing application emails, recruiter outreach, and transactional notices.
  - **JMAP (Port 8080 / HTTPS)**: JSON-based bidirectional email synchronization used by the application tracker to read recruiter responses without IMAP polling lag.
  - **IMAP / POP3**: Standard fallback protocols.
- **Network Isolation**: Stalwart connects directly to the Next.js application container over the private `morigrid-net` Docker network. The Next.js app communicates via `smtp://stalwart:587` internally rather than hairpinning through public DNS.

### 4.2 Deliverability & DNS Configuration
To ensure maximum deliverability for candidate job applications, the following DNS records are enforced on `morigrid.com` and `buildairesume.com`:
- **SPF**: `v=spf1 ip4:<VPS_IPV4> -all` (Strict SPF rejection).
- **DKIM**: 2048-bit RSA key configured in Stalwart, published via DNS TXT record (`stalwart._domainkey.<domain>`).
- **DMARC**: `v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s; rua=mailto:dmarc-reports@<domain>`
- **PTR / rDNS**: Reverse DNS on the hosting provider matches the mail server HELO/EHLO hostname (`mail.<domain>`).
- **Anti-Spam / Open Relay Protection**: Relaying is strictly disabled for unauthenticated connections. Only authenticated local services can submit email.

---

## 5. Background Workers & Microservices

### 5.1 Standalone Job Ingestion Microservice (`apps/resumebuilder-worker`)
A dedicated Node.js service running on port `4001`:
- **Direct ATS Pollers**: Structured API pollers for Greenhouse (`boards-api.greenhouse.io`), Lever (`api.lever.co`), and Ashby (`jobs.ashbyhq.com`).
- **Aggregators**: JobSpy, Adzuna, Remotive, and RemoteOK adapters.
- **Normalizer & Deduplicator**: Normalizes job payloads, removes HTML formatting, derives canonical requisition identifiers, and matches against existing MongoDB entries using SHA-256 fingerprints before inserting.
- **Scheduler**: Controlled by `CronLock` models to ensure distributed pollers never run concurrent duplicate sweeps.

### 5.2 Application Automation Worker (Playwright)
An isolated automation worker designed for automated application submission:
- **Deterministic Selectors**: Form field mapping (First Name, Last Name, Email, Phone, LinkedIn, Portfolio, Resume File) is performed via deterministic DOM and Shadow DOM inspection.
- **Context Isolation**: Every application run creates a clean, ephemeral browser context (`browser.newContext()`) and terminates it in a `finally` block to prevent cross-session cookie bleeding.
- **CAPTCHA Safe-Halt**: If Cloudflare Turnstile, reCAPTCHA, or hCaptcha is detected, the worker immediately halts, saves DOM snapshots and screenshots, and updates application state to `NEEDS_USER_ACTION`.
- **Quality Gate Verification**: Verifies candidate identity, work authorization constraints, valid resumes, and answered mandatory questions prior to clicking final submission buttons.

### 5.3 Asynchronous Email Dispatcher
Application and transactional emails are queued into MongoDB (`ApplicationEmailQueue`, `TrackerEmail`) and dispatched asynchronously by an internal worker loop, guaranteeing that HTTP user requests never block on SMTP handshakes.

---

## 6. Object Storage (Cloudflare R2)

- **Provider**: Cloudflare R2 (S3-compatible API).
- **Zero Egress Fees**: Ensures high-frequency PDF downloads and resume preview generation incur no bandwidth penalties.
- **Buckets**:
  - `buildairesume-resumes`: Generated PDF and DOCX resume exports.
  - `buildairesume-user-uploads`: Original uploaded CV documents, avatars, and application attachments.
- **Access Model**: Uploads use pre-signed PUT URLs generated by the API. Downloads are served via secure temporary signed GET URLs or verified proxy routes.

---

## 7. Telemetry & Operations Monitoring

### 7.1 Checkmate VPS Monitoring
A lightweight Python daemon (`scripts/vps-status-probe.mjs`, `checkmate-monitoring.md`) running on the host:
- Monitors CPU load, RAM allocation, NVMe disk I/O, and container health.
- Exposes metrics to internal telemetry endpoints with token authentication (`INGESTION_WORKER_TOKEN`).

### 7.2 Health Probes & Diagnostics
- **`/api/health`**: Verifies database connectivity, worker queue status, and memory usage.
- **Admin Ingestion Monitor**: Displays real-time metrics for active sources, batch latency, queue throughput, and duplicate prevention rates.
- **Sentry Integration**: Captures uncaught runtime errors in Next.js App Router and worker subprocesses with environment tagging (`production`, `staging`, `development`).
