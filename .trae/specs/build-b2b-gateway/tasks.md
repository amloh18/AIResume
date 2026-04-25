# Tasks

- [x] Task 1: B2B Tenant Foundation, RBAC, and Security
  - [x] SubTask 1.1: Update database schema to support B2B Tenants, API Keys, and RBAC (Admin vs Recruiter).
  - [x] SubTask 1.2: Implement strict `tenantId` isolation in all B2B queries to prevent IDOR.
  - [x] SubTask 1.3: Create API Key generation endpoints and implement Redis/Edge middleware caching for validation.

- [x] Task 2: Developer Hub API Implementation
  - [x] SubTask 2.1: Implement `POST /api/v1/b2b/parse` and `POST /api/v1/b2b/score` endpoints.
  - [x] SubTask 2.2: Implement `POST /api/v1/b2b/batch` for asynchronous bulk processing.
  - [x] SubTask 2.3: Implement Webhook registration (`POST /api/v1/b2b/webhooks`) and dispatch logic with cryptographic signatures.

- [x] Task 3: Data Privacy, Compliance, and Rate Limiting
  - [x] SubTask 3.1: Implement `DELETE /api/v1/b2b/candidate/{id}` endpoint for GDPR/CCPA compliance.
  - [x] SubTask 3.2: Create automated cron jobs for data retention policies (auto-delete after 30/60/90 days).
  - [x] SubTask 3.3: Implement rate limiting middleware based on Tenant subscription tiers (return 429).

- [x] Task 4: HR Interface - Analytics, Sandbox & Billing
  - [x] SubTask 4.1: Build B2B Dashboard layout with RBAC-aware navigation.
  - [x] SubTask 4.2: Create Sandbox UI for manual resume upload and testing.
  - [x] SubTask 4.3: Implement Usage Analytics and Billing dashboard showing API limits, calls, and tier information.

- [x] Task 5: HR Interface - Smart Roster & Candidate View
  - [x] SubTask 5.1: Build paginated Smart Roster data grid with advanced filtering (Score, Skills, Location).
  - [x] SubTask 5.2: Build Detailed Candidate View showing CV vs Job Description analysis.
  - [x] SubTask 5.3: Connect UI to B2B APIs to demonstrate real-time data fetching.

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 1
- Task 4 depends on Task 1
- Task 5 depends on Task 2 and Task 4
