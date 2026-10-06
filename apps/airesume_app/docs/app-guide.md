# App guide

AIResume is an AI-powered career platform. It is not a resume template site and not a job board — it
is the pipeline in between:

    BUILD  →  MATCH  →  TAILOR  →  APPLY  →  TRACK  →  LEARN

Each stage feeds the next, and the last one feeds back into the first. The point of the product is
that the loop closes: what actually got you interviews changes what the system suggests next.

---

## 1. The Master CV is the source of truth

Everything downstream is derived from a single **Master CV** — your real, complete professional
record: profile, summary, experience, achievements, skills, education, projects, certifications and
links.

The AI may **reorganise, prioritise, summarise, rephrase and select**. It may not **invent** —
no fabricated employment, skills, certifications, education, achievements, metrics, or work
authorisation. When a job needs something the Master CV does not contain, the system stops and asks
you rather than guessing.

This is the design constraint the whole product is built around. A tailored CV that is a
reorganisation of your real record is defensible in an interview. One that is a plausible invention
is not.

## 2. BUILD

An interactive editor with multiple visual layouts and templates, live preview, and ATS scoring.

- The editor is the primary surface. Your CV is editable at every step — nothing is locked behind a
  generated PDF.
- Templates are layout definitions over the same underlying data, so switching one never costs you
  content.
- ATS scoring runs against the same document you are editing, so the score moves as you fix things.
- Export produces a PDF through a real rendering pipeline, not a screenshot.

## 3. MATCH

Job discovery pulls from multiple sources, normalises them into one shape, and deduplicates so the
same role from three feeds is one job.

Sources fall into two tiers:

- **Direct ATS feeds** (Greenhouse, Lever, Ashby, Workable) — the highest-fidelity source, because
  the posting is the employer's own record.
- **Aggregators and boards** (Adzuna, Remotive, RemoteOK, JobSpy, LinkedIn) — broader coverage.

Every job gets a canonical identity so re-ingestion updates rather than duplicates, and so an
application can be tied to the job it came from.

Matching scores your Master CV against a specific posting and explains *why* — which requirements
you meet, which you partially meet, and which are genuinely missing.

## 4. TAILOR

Per-application tailoring: a CV and cover letter aimed at one job, generated from the Master CV.

- Emphasis is re-weighted toward the posting's requirements.
- Wording is adapted to the employer's vocabulary — the ATS and the first human reader look for the
  same terms.
- Nothing is fabricated. Every claim traces back to the Master CV.

Tailored documents are versioned per application, so you can see exactly what you sent where.

## 5. APPLY

Three tiers, in increasing order of automation:

| Tier | What happens |
| --- | --- |
| **Manual** | The system prepares the documents and the answers; you submit. |
| **Assisted** | Fields are pre-filled from your Master CV; you review and submit. |
| **Auto-Apply** | A deterministic browser automation fills and submits the application on supported ATS platforms. |

Auto-Apply is deliberately narrow. It runs against a small, explicitly-supported set of ATS
platforms, with per-job isolation and ephemeral browser contexts. It **halts safely** rather than
guessing: a CAPTCHA, an unexpected field, or a login wall stops the run and hands the job back to you
for manual review. It never invents an answer to a question it cannot answer from your Master CV.

Application answers and cover letters are generated from the same evidence as everything else.

## 6. TRACK

Every application is a journey, not a row in a table. The tracker follows status changes over time,
ties each stage to the documents that were sent, and ingests inbound email so replies land against
the right application instead of in a separate inbox.

- Documents are linked to the application they were generated for.
- Readiness is *derived* from what actually exists — a generated document counts, a preview does not.
- Inbound replies are matched to applications automatically.

## 7. LEARN

Analytics over the whole pipeline: which sources produce interviews, which tailoring patterns
convert, where applications stall, and how outcomes trend over time.

The dashboard is the input to the next BUILD — the loop closes.

---

## How the pieces are deployed

The repository ships two independently deployable projects:

| Project | Path | Role |
| --- | --- | --- |
| **app** | `apps/airesume_app/` | The Next.js web application, and its own background workers. |
| **resumebuilder-worker** | `apps/resumebuilder-worker/` | The job-ingestion service — source adapters, normalisation, deduplication, scheduler. |

They share no source and are installed and deployed independently. The app builds two Docker targets
from one Dockerfile: `runner` (the web tier) and `worker` (email delivery, inbound mail, the
application queue, reconciliation). Splitting them means a site redeploy does not kill an in-flight
application.

Optional capabilities — headless browsers for Auto-Apply, local transcription, Python-based
scrapers — are **host services**, not part of the app image. When they are absent the app degrades
predictably: ingestion skips that source, Auto-Apply routes to manual review, PDF export falls back
to a client-side renderer. See [self-hosting](self-hosting.md).

## Licensing

MIT. See [LICENSE](../LICENSE).
