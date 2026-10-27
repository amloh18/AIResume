```markdown
<div align="center">

# 🚀 AIResume

**An AI-powered career platform that takes a job seeker from an empty page to a tracked application — and learns from the outcome.**

[![Live Demo](https://img.shields.io/badge/🌐_Live_App-buildairesume.com-0052CC?style=for-the-badge&logo=googlechrome&logoColor=white)](https://buildairesume.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-013f2e.svg?style=for-the-badge)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge)](CONTRIBUTING.md)

<br />

[![Next.js 16](https://img.shields.io/badge/Next.js_16-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React 19](https://img.shields.io/badge/React_19-61dafb?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript 5](https://img.shields.io/badge/TypeScript_5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node 22](https://img.shields.io/badge/Node_22-5fa04e?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB_Mongoose_8-47a248?style=flat-square&logo=mongodb&logoColor=white)](https://www.mongodb.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_3-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Playwright](https://img.shields.io/badge/Playwright-2EAD33?style=flat-square&logo=playwright&logoColor=white)](https://playwright.dev)

---

### 🔄 The Continuous Application Loop


```

┌─────────┐      ┌─────────┐      ┌─────────┐      ┌─────────┐      ┌─────────┐      ┌─────────┐
│  BUILD  │ ───► │  MATCH  │ ───► │ TAILOR  │ ───► │  APPLY  │ ───► │  TRACK  │ ───► │  LEARN  │
└─────────┘      └─────────┘      └─────────┘      └─────────┘      └─────────┘      └─────────┘

```

</div>

---

## 🌐 Live Application

AIResume is fully deployed and accessible in production. You can experience the platform end-to-end today:

> ### 🔗 **[buildairesume.com](https://buildairesume.com)**
> 
> * **Master CV Builder:** Create an authoritative, single-source-of-truth profile.
> * **Automated Matcher:** Ingest live job leads filtered to your precise career stack.
> * **ATS Score & Tailor:** Generate tailored resumes and cover letters with deterministic AI constraints.
> * **Application Funnel:** Track stage migrations, outbound submissions, and incoming status updates.

---

## 📌 Table of Contents

- [What We Built](#-what-we-built)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [System Architecture](#-system-architecture)
- [Repository Structure](#-repository-structure)
- [Getting Started](#-getting-started)
- [Environment Configuration](#-environment-configuration)
- [Scripts & Commands](#-scripts--commands)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Security](#-security)
- [Contributing](#-contributing)
- [License](#-license)
- [Acknowledgements](#-acknowledgements)

---

## 💡 What We Built

Most resume tools generate a static document. We built the complete end-to-end job hunting workflow around it — because the document is only a fraction of getting hired.

### Core Architectural Pillars

| Pillar | Strategy |
| :--- | :--- |
| **Master CV Grounding** | Stored once (*roles, achievements, skills, education*). The AI prioritises and rephrases evidence; **it is strictly prohibited from inventing facts**. |
| **ATS Machine Readability** | Every generated PDF is scored against target postings to ensure high-fidelity parsing by modern Applicant Tracking Systems. |
| **Measurable Pipeline** | Applications are tracked objects with full lifecycles, enabling outcome analytics (*what got interviews vs. what got rejected*). |

---

## ✨ Key Features


```

```
      ┌────────────────────────────────────────────────────────┐
      │                    AIRESUME MODULES                    │
      └────────────────────────────────────────────────────────┘
        │          │           │           │          │
┌───────┴──┐   ┌───┴────┐  ┌───┴────┐  ┌───┴────┐  ┌──┴─────┐
│  BUILD   │   │ MATCH  │  │ TAILOR │  │ APPLY  │  │ TRACK  │
└──────────┘   └────────┘  └────────┘  └────────┘  └────────┘

```

```

### 🛠️ Build
* **Interactive Editor:** Live, structured evidence builder with real-time feedback.
* **Master CV:** Single source of truth for all downstream applications.
* **Multi-Template Engine:** Switch visual layouts dynamically without re-entering professional records.
* **Dual Rendering:** Fast client side previews paired with server-rendered PDF exports.

### 🎯 Match
* **Multi-Source Ingestion:** Aggregates jobs from Adzuna, Remotive, RemoteOK, JobSpy, LinkedIn, and direct ATS feeds.
* **Canonical Deduplication:** Merges identical job postings from multiple sources into a single identity.
* **Smart Matching:** Matches candidates against aggregated demand based on deep structural fit.

### ✂️ Tailor
* **Evidence-Grounded AI:** Re-prioritises and rephrases experience per job without hallucinating background details.
* **ATS Scoring:** Clear, inspectable target score breakdown per vacancy.
* **Cover Letters:** Auto-generates cover letters and outbound emails off the same underlying evidence.

### 🤖 Apply
* **Multi-Path Submissions:** Supports manual, assisted, and fully automated application routes.
* **Browser Automation:** Deterministic DOM-based automation for Greenhouse, Lever, Ashby, and Workable via Playwright.
* **Safe-Halt Controls:** Interruption triggers on CAPTCHAs, invalid inputs, or dynamic forms hand control smoothly back to the candidate.

### 📊 Track & Platform
* **Pipeline Analytics:** Complete funnel metrics, conversion rates, and outcome reporting.
* **Email Processing:** Inbound JMAP mail processing directly updates application status.
* **Bring-Your-Own-AI:** Out-of-the-box support for Google Gemini, OpenAI-compatible APIs, and local Ollama instances.
* **Global Monetisation:** Dual payment integration with Razorpay and Stripe featuring region-aware pricing.

---

## 🛠️ Tech Stack

### Frontend & Core App
![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Radix UI](https://img.shields.io/badge/Radix_UI-161618?style=for-the-badge&logo=radix-ui&logoColor=white)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-0055FF?style=for-the-badge&logo=framer&logoColor=white)

### Backend, Database & Infrastructure
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Cloudflare](https://img.shields.io/badge/Cloudflare-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-2EAD33?style=for-the-badge&logo=playwright&logoColor=white)

---

## 🏗️ System Architecture

AIResume operates as a monorepo of decoupled, independently deployable services.


```

```
                  ┌──────────────────────────────┐

```

job sources ───────►│    resumebuilder-worker      │
(Adzuna, Remotive,  │  adapters ──► normalise ──►   │
RemoteOK, JobSpy,   │  deduplicate ──► scheduler   │
LinkedIn, ATSes)    └──────────────┬───────────────┘
│
│ writes
▼
┌─────────────────┐
│     MongoDB     │
└────────┬────────┘
│
│ reads
▼
browser ───────────►┌──────────────────────────────┐
│      airesume_app (Next)     │
│  BUILD · MATCH · TAILOR ·    │
│  APPLY · TRACK · LEARN       │
│  web tier  │  bg worker      │
└──────────────────────────────┘
▲
┌──────────────┴───────────────┐
│   admin (private repo)       │
└──────────────────────────────┘

```

> 💡 **Container Decoupling:** The main application ships as two runtime containers from one image: a `runner` target for the web tier and a `worker` target for background loops (inbound email, reconciliation, application queues).

---

## 📂 Repository Structure

```gcode
.
├── 📁 apps/
│   ├── 📁 airesume_app/            # Main Next.js Web App & Background Worker
│   │   ├── 📁 src/app/             # App router, pages, and API handlers
│   │   ├── 📁 src/components/      # UI component library & resume editor
│   │   ├── 📁 src/lib/             # Tailoring engine, scoring algorithms & auth
│   │   ├── 📁 src/models/          # Mongoose data models
│   │   ├── 📁 src/workers/         # Dedicated background worker processes
│   │   ├── 📁 scripts/             # DB migration & seed utilities
│   │   └── 📄 .env.example         # Environment variable documentation
│   ├── 📁 resumebuilder-worker/    # Standalone Job Ingestion Service
│   └── 📁 admin/                   # Private operational dashboard (separate repo)
├── 📁 deploy/                      # Infrastructure & Docker configuration
├── 📁 scripts/                     # Host & VPS management tooling
├── 📄 Dockerfile                   # Multi-stage production container build
└── 📄 LICENSE                      # License details

```

---

## 🚀 Getting Started

### Prerequisites

* **Node.js:** `22.x` (pinned via `engines`)
* **MongoDB:** `v6.0+` (Local or Atlas instance)
* **Docker:** *(Optional)* For running production containers locally

### Quickstart Setup

1. **Clone the repository:**
```bash
git clone [https://github.com/amloh18/CVCircle_app.git](https://github.com/amloh18/CVCircle_app.git) AIResume
cd AIResume

```


2. **Configure and run the Web App (`airesume_app`):**
```bash
cd apps/airesume_app
cp .env.example .env.local
npm ci --legacy-peer-deps
npm run dev

```


> App will be running at **`http://localhost:3000`**


3. **(Optional) Run the Job-Ingestion Service:**
```bash
cd apps/resumebuilder-worker
cp .env.example .env
npm ci
npm run dev

```


> Service health check available at **`http://localhost:4001/health`**



### Monorepo Root Helper Commands

| Command | Action |
| --- | --- |
| `npm run dev` | Launches the Next.js web application dev server |
| `npm run build` | Builds the production Next.js bundle |
| `npm run build:worker` | Bundles background workers to `dist/worker.mjs` |
| `npm run test` | Executes the Vitest test suites |
| `npm install:all` | Executes `npm ci` across all workspace projects |

---

## 🔐 Environment Configuration

All application configurations are driven by environment variables. Copy `.env.example` to set up your environment:

```bash
cp apps/airesume_app/.env.example apps/airesume_app/.env.local

```

> [!WARNING]
> ### Crucial Environment Guardrails
> 
> 
> 1. **No Runtime Secrets in Builds:** Build steps must remain completely decoupled from production secrets.
> 2. **Worker Role Separation:** Set `WORKER_ROLE=web` on the web tier to prevent web containers from executing background worker routines.
> 3. **Cron Security:** If `CRON_SECRET` or `CRON_API_KEY` are missing, `/api/cron/*` routes automatically fail closed (`503`).
> 
> 

---

## ⚡ Scripts & Operations

Inside `apps/airesume_app`:

| Command | Description |
| --- | --- |
| `npm run dev` | Starts local Next.js server on port 3000 |
| `npm run build` | Compiles production assets *(Requires ~4GB Heap)* |
| `npm run start` | Runs production server instance |
| `npm run test` | Executes unit tests via Vitest |
| `npm run type-check` | Performs TypeScript validation via `tsc --noEmit` |
| `npm run lint` | Runs ESLint rules |

---

## 🧪 Testing

Run unit and integration suites using Vitest:

```bash
cd apps/airesume_app
npm test

```

---

## 🐳 Deployment

Deploy production targets easily using Docker and Dokploy:

```bash
# Build Application Containers (Run from REPOSITORY ROOT)
docker build --target runner -t airesume-web .
docker build --target worker -t airesume-worker .

# Build Ingestion Container (Run from apps/resumebuilder-worker)
docker build -t resumebuilder-worker apps/resumebuilder-worker

```

---

## 🔒 Security

We maintain strict security hygiene:

* Zero hardcoded secrets in public source trees.
* Strict input validation across ATS form automation steps.

Please refer to **[SECURITY.md](SECURITY.md)** for responsible disclosure guidelines. **Do not create public issues for security vulnerabilities.**

---

## 🤝 Contributing

We welcome contributions! Please review **[CONTRIBUTING.md](CONTRIBUTING.md)** for guidelines.

1. **Keep Pull Requests Focused:** One fix or feature per PR.
2. **Never Commit Secrets:** Always verify `.env` parameters are sanitized.
3. **Follow the Code of Conduct:** Read our [Contributor Covenant](https://www.google.com/search?q=CODE_OF_CONDUCT.md).

---

## 📄 License

This project is licensed under the **[MIT License](https://www.google.com/search?q=LICENSE)**.

---

## 🙏 Acknowledgements

AIResume is built with gratitude on top of incredible open-source tools and frameworks:
[Next.js](https://nextjs.org) • [React](https://react.dev) • [MongoDB](https://www.mongodb.com) • [Playwright](https://playwright.dev) • [Tailwind CSS](https://tailwindcss.com) • [Radix UI](https://www.radix-ui.com) • [Vitest](https://vitest.dev)

---
