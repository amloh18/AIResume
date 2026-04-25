# CV Circle B2B Platform Roadmap

## Overview
This roadmap details the strategic and technical phases to evolve CV Circle from an individual consumer tool into a full-suite Talent Intelligence platform. It outlines the transition from a simple API wedge to an intelligent sourcing and interviewing platform, providing deep value to both technical integrators and HR stakeholders.

---

## Phase 1: Establish the Wedge – API & "Explainable AI" Dashboard (Months 1-2)
**Goal:** Launch the core JSON parser, the scoring engine, and the visual dashboard to prove immediate value to both developers and HR teams.

### 1. Build the Parsing & Scoring Engine
*   **Tech Implementation:** Utilize Google Gemini to power the NLP logic. Set up prompts to extract unstructured CV data (PDF/DOCX) into strict JSON schemas. Use the model's large context window to compare the parsed CV against the Job Description.
*   **Explainability:** Do not just output a score (e.g., "82%"). The API response must include an `analysis_summary` array detailing exactly *why* points were awarded or deducted (e.g., "Candidate has 5 years of frontend experience but lacks the required CI/CD deployment knowledge").

### 2. Develop the Developer Hub (API Portal)
*   **Infrastructure:** Set up a multi-tenant PostgreSQL database.
*   **Endpoints:** Create secure RESTful endpoints (`/api/v1/b2b/parse` and `/api/v1/b2b/score`).
*   **Monetization & Security:** Implement API key generation, rate limiting, and Stripe billing tied to usage volume (pay-per-parse).

### 3. Build the B2B HR Dashboard
*   **Tech Implementation:** Construct the frontend using React (Next.js). To appeal to modern startups and tech-forward HR teams, utilize a clean, minimalist UI/UX design. Incorporate glassmorphism elements and flat startup illustrations to give the dashboard a premium, lightweight feel that contrasts heavily with clunky enterprise ATS interfaces.
*   **Smart Roster:** Create a data grid for advanced visual filtering of parsed candidates.
*   **Sandbox Environment:** Implement a drag-and-drop sandbox so recruiters can test the AI manually before committing to an API integration.

---

## Phase 2: The Middleware Layer – Integrations & Batching (Months 3-4)
**Goal:** Stop making recruiters log into your dashboard. Push your scores directly into the tools they already use.

### 1. Implement Asynchronous Batching
*   **Infrastructure:** Set up message queues (like RabbitMQ or AWS SQS) so clients can send payloads of 500+ CVs without timing out the servers.
*   **Webhooks:** Launch Webhooks (`POST /api/v1/b2b/webhooks`) to securely ping the client's server when a batch job finishes, using cryptographic signatures.

### 2. Build Native ATS Connectors
*   **Targets:** Focus on the top mid-market platforms first: Greenhouse and Lever.
*   **Integration:** Build a middle-tier service using OAuth. When a client connects their Greenhouse account to CV Circle, the system automatically listens for "New Candidate" webhooks from Greenhouse, runs the score, and pushes the explainable score back into the Greenhouse UI via their API.

### 3. Go-to-Market Action
*   **Positioning:** Start co-marketing as an "Add-on" for these ATS platforms. Pitch to technical recruiters: *"Don't replace your ATS; make it 10x smarter in 5 minutes."*

---

## Phase 3: "Dark Data" Sourcing (Months 5-6)
**Goal:** Transition from an inbound filter to an outbound sourcing tool using the client's existing historical data.

### 1. The "Database Refresh" Feature
*   **Tech Implementation:** Add a feature in the React dashboard where a recruiter can paste a new Job Description and click "Search Past Candidates."
*   **Algorithm:** The API queries the B2B client's tenant database for all historically parsed CVs, running a lightweight matching algorithm to surface top candidates who applied years ago but match today's role perfectly.

### 2. Analytics & ROI Tracking
*   **Dashboard Expansion:** Build out the dashboard analytics. Show the client: "You processed 1,000 CVs this month, saved 45 hours of manual screening, and rediscovered 12 qualified candidates from your archives."

---

## Phase 4: Down-Funnel Automation (Months 7-8)
**Goal:** Move beyond the recruiter and create tools for the hiring managers who actually conduct the interviews.

### 1. Dynamic Interview Guides
*   **Endpoints:** Add a new endpoint: `/api/v1/b2b/interview-guide`. 
*   **Generative AI:** Because the AI already mapped the gaps between the candidate and the JD, prompt the model to generate 3-5 highly specific, technical interview questions designed to probe those exact weaknesses. 
*   **Delivery:** Display this in the dashboard and push it directly to the calendar invites of the hiring managers.

### 2. Skill Taxonomy & Standardization
*   **Data Normalization:** Start standardizing the parsed data. Instead of just extracting "React.js" and "React Native", normalize them into a unified skill taxonomy tree so enterprise clients can run advanced BI (Business Intelligence) reports on the overall skill density of their applicant pool.

---

## Conclusion
By following this sequence, CV Circle monetizes the core technology immediately in Phase 1, solves the massive integration hurdle in Phase 2, and then expands the product's footprint into the highly lucrative sourcing and interviewing spaces in Phases 3 and 4.
